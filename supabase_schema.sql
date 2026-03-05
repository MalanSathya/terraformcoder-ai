-- 1. Alter Generations Table (Add any missing columns if they don't exist yet)
-- NOTE: If these run and fail saying "column already exists", that's totally fine, just ignore it.
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS estimated_cost TEXT;
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS resources JSONB;
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS file_hierarchy TEXT;
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS architecture_diagram JSONB;

-- Make sure RLS is enabled on generations
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

-- If you don't have these policies yet, run these (if they error as "already exists", ignore them)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'generations' AND policyname = 'Users can only view their own generations'
    ) THEN
        CREATE POLICY "Users can only view their own generations" ON public.generations FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'generations' AND policyname = 'Users can only insert their own generations'
    ) THEN
        CREATE POLICY "Users can only insert their own generations" ON public.generations FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;

-- Create index for faster history lookups
CREATE INDEX idx_generations_user_id ON public.generations(user_id);
CREATE INDEX idx_generations_created_at ON public.generations(created_at DESC);


-- 2. Create Subscriptions Table
CREATE TABLE public.subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    current_period_end TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their own subscription"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- Backend service role bypassing RLS handles inserts/updates


-- 3. Create Usage Tracking Table
CREATE TABLE public.usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    month TEXT NOT NULL, -- Format: 'YYYY-MM'
    generation_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, month)
);

-- Enable RLS for usage
ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their own usage"
ON public.usage FOR SELECT
USING (auth.uid() = user_id);


-- 4. Create Postgres Function to increment usage safely
CREATE OR REPLACE FUNCTION public.increment_usage_count(p_user_id UUID, p_month TEXT)
RETURNS void AS $$
BEGIN
    INSERT INTO public.usage (user_id, month, generation_count)
    VALUES (p_user_id, p_month, 1)
    ON CONFLICT (user_id, month)
    DO UPDATE SET 
        generation_count = public.usage.generation_count + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
