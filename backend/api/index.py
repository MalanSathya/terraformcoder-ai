from http.server import BaseHTTPRequestHandler
import json
import urllib.parse as urlparse

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Parse the URL
        parsed_path = urlparse.urlparse(self.path)
        
        # CORS headers
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        
        # Route handling
        if parsed_path.path == '/api' or parsed_path.path == '/api/':
            response = {
                'message': 'TerraformCoder AI API is working!',
                'version': '1.0.0',
                'status': 'healthy',
                'path': self.path
            }
        elif parsed_path.path == '/api/health':
            response = {
                'status': 'healthy',
                'timestamp': '2024-01-01T00:00:00Z'
            }
        elif parsed_path.path == '/api/templates':
            response = {
                'templates': [
                    {'name': 'VPC', 'description': 'Basic VPC setup'},
                    {'name': 'EC2', 'description': 'EC2 instance'}
                ]
            }
        else:
            response = {
                'error': 'Not found',
                'path': self.path,
                'available_endpoints': ['/api', '/api/health', '/api/templates']
            }
        
        self.wfile.write(json.dumps(response).encode())

    def do_POST(self):
        content_length = int(self.headers['Content-Length']) if 'Content-Length' in self.headers else 0
        post_data = self.rfile.read(content_length)
        
        # CORS headers
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        
        parsed_path = urlparse.urlparse(self.path)
        
        if parsed_path.path == '/api/generate':
            try:
                data = json.loads(post_data.decode('utf-8'))
                description = data.get('description', '')
                provider = data.get('provider', 'aws')
                
                # Generate basic Terraform
                if 'vpc' in description.lower():
                    code = '''resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  
  tags = {
    Name = "main-vpc"
  }
}

output "vpc_id" {
  value = aws_vpc.main.id
}'''
                    explanation = "Created a basic VPC with 10.0.0.0/16 CIDR block"
                    resources = ["aws_vpc"]
                else:
                    code = f'''terraform {{
  required_providers {{
    {provider} = {{
      source  = "hashicorp/{provider}"
      version = "~> 5.0"
    }}
  }}
}}

provider "{provider}" {{
  region = "us-east-1"
}}'''
                    explanation = f"Basic {provider} configuration"
                    resources = ["provider"]
                
                response = {
                    'code': code,
                    'explanation': explanation,
                    'resources': resources
                }
            except Exception as e:
                response = {'error': f'Generation failed: {str(e)}'}
        else:
            response = {'error': 'POST endpoint not found'}
        
        self.wfile.write(json.dumps(response).encode())

    def do_OPTIONS(self):
        # Handle CORS preflight
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()