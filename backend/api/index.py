from http.server import BaseHTTPRequestHandler
import json
import urllib.parse as urlparse
import os
from datetime import datetime, timedelta
import base64
import hashlib

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Parse the URL
        parsed_path = urlparse.urlparse(self.path)
        query_params = urlparse.parse_qs(parsed_path.query)
        
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
                'features': ['terraform_generation', 'templates', 'validation'],
                'openai_configured': bool(os.getenv('OPENAI_API_KEY')),
                'timestamp': datetime.utcnow().isoformat()
            }
        elif parsed_path.path == '/api/health':
            response = {
                'status': 'healthy',
                'uptime': 'running',
                'timestamp': datetime.utcnow().isoformat(),
                'version': '1.0.0'
            }
        elif parsed_path.path == '/api/templates':
            response = {
                'templates': [
                    {
                        'id': 'vpc-basic',
                        'name': 'VPC with Subnets',
                        'description': 'Basic VPC with public and private subnets',
                        'category': 'networking',
                        'provider': 'aws',
                        'complexity': 'beginner'
                    },
                    {
                        'id': 'ec2-basic',
                        'name': 'EC2 Instance',
                        'description': 'EC2 instance with security group',
                        'category': 'compute',
                        'provider': 'aws',
                        'complexity': 'beginner'
                    },
                    {
                        'id': 'rds-mysql',
                        'name': 'RDS MySQL Database',
                        'description': 'MySQL RDS instance with backup',
                        'category': 'database',
                        'provider': 'aws',
                        'complexity': 'intermediate'
                    },
                    {
                        'id': 's3-website',
                        'name': 'S3 Static Website',
                        'description': 'S3 bucket for static website hosting',
                        'category': 'storage',
                        'provider': 'aws',
                        'complexity': 'beginner'
                    }
                ],
                'total': 4
            }
        elif parsed_path.path == '/api/validate':
            # Get code from query parameter
            code = query_params.get('code', [''])[0]
            response = self.validate_terraform_code(code)
        elif parsed_path.path == '/api/stats':
            response = {
                'total_users': 1,  # Mock data for now
                'total_projects': 0,
                'ai_enabled': bool(os.getenv('OPENAI_API_KEY')),
                'popular_templates': ['vpc-basic', 'ec2-basic'],
                'timestamp': datetime.utcnow().isoformat()
            }
        else:
            response = {
                'error': 'Endpoint not found',
                'path': self.path,
                'available_endpoints': [
                    'GET /api - API info',
                    'GET /api/health - Health check',
                    'GET /api/templates - Get templates',
                    'GET /api/validate?code=... - Validate Terraform',
                    'GET /api/stats - Get statistics',
                    'POST /api/generate - Generate Terraform',
                    'POST /api/auth/register - Register user',
                    'POST /api/auth/login - Login user'
                ]
            }
        
        self.wfile.write(json.dumps(response, indent=2).encode())

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
        
        try:
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
        except:
            self.wfile.write(json.dumps({'error': 'Invalid JSON'}).encode())
            return
        
        if parsed_path.path == '/api/generate':
            response = self.generate_terraform(data)
        elif parsed_path.path == '/api/auth/register':
            response = self.register_user(data)
        elif parsed_path.path == '/api/auth/login':
            response = self.login_user(data)
        elif parsed_path.path == '/api/projects':
            response = self.create_project(data)
        else:
            response = {'error': 'POST endpoint not found', 'path': self.path}
        
        self.wfile.write(json.dumps(response, indent=2).encode())

    def do_OPTIONS(self):
        # Handle CORS preflight
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def generate_terraform(self, data):
        """Generate Terraform code based on description"""
        description = data.get('description', '').lower()
        provider = data.get('provider', 'aws')
        
        if not description:
            return {'error': 'Description is required'}
        
        # Enhanced template generation
        if 'vpc' in description or 'network' in description:
            code = '''# VPC Configuration
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = var.vpc_name
    Environment = var.environment
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.vpc_name}-igw"
  }
}

# Public Subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = var.availability_zone
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.vpc_name}-public-subnet"
    Type = "Public"
  }
}

# Variables
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for public subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "vpc_name" {
  description = "Name for the VPC"
  type        = string
  default     = "main-vpc"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "availability_zone" {
  description = "Availability zone"
  type        = string
  default     = "us-east-1a"
}

# Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "ID of the public subnet"
  value       = aws_subnet.public.id
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = aws_internet_gateway.main.id
}'''
            explanation = "Created a VPC with public subnet, internet gateway, and proper tagging"
            resources = ["aws_vpc", "aws_internet_gateway", "aws_subnet"]
            
        elif 'ec2' in description or 'instance' in description:
            code = '''# Security Group
resource "aws_security_group" "web" {
  name_prefix = "${var.instance_name}-sg"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidr
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.instance_name}-sg"
  }
}

# EC2 Instance
resource "aws_instance" "main" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  key_name              = var.key_name
  vpc_security_group_ids = [aws_security_group.web.id]
  subnet_id             = var.subnet_id

  tags = {
    Name        = var.instance_name
    Environment = var.environment
  }
}

# Variables
variable "ami_id" {
  description = "AMI ID for the instance"
  type        = string
  default     = "ami-0c02fb55956c7d316"  # Amazon Linux 2
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t2.micro"
}

variable "key_name" {
  description = "EC2 Key Pair name"
  type        = string
}

variable "instance_name" {
  description = "Name for the instance"
  type        = string
  default     = "web-server"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_id" {
  description = "Subnet ID"
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "CIDR blocks allowed for SSH"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Restrict this in production!
}

# Outputs
output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.main.id
}

output "public_ip" {
  description = "Public IP address"
  value       = aws_instance.main.public_ip
}

output "security_group_id" {
  description = "ID of the security group"
  value       = aws_security_group.web.id
}'''
            explanation = "Created EC2 instance with security group, SSH and HTTP access"
            resources = ["aws_instance", "aws_security_group"]
            
        elif 'rds' in description or 'database' in description:
            code = '''# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.db_name}-subnet-group"
  subnet_ids = var.subnet_ids

  tags = {
    Name = "${var.db_name} DB subnet group"
  }
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name_prefix = "${var.db_name}-rds-sg"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  tags = {
    Name = "${var.db_name}-rds-sg"
  }
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier     = var.db_name
  engine         = "mysql"
  engine_version = "8.0"
  instance_class = var.db_instance_class
  
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp2"
  storage_encrypted     = true

  db_name  = var.database_name
  username = var.db_username
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = var.backup_retention_period
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  skip_final_snapshot = true  # Set to false in production
  deletion_protection = false # Set to true in production

  tags = {
    Name        = var.db_name
    Environment = var.environment
  }
}

# Variables
variable "db_name" {
  description = "Database identifier"
  type        = string
  default     = "myapp-db"
}

variable "database_name" {
  description = "Database name"
  type        = string
  default     = "myapp"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "admin"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Maximum allocated storage in GB"
  type        = number
  default     = 100
}

variable "backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs"
  type        = list(string)
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the database"
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

# Outputs
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "rds_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}'''
            explanation = "Created RDS MySQL database with security group, backup configuration, and encryption"
            resources = ["aws_db_instance", "aws_db_subnet_group", "aws_security_group"]
            
        else:
            code = f'''# Basic {provider} Configuration
terraform {{
  required_providers {{
    {provider} = {{
      source  = "hashicorp/{provider}"
      version = "~> 5.0"
    }}
  }}
}}

provider "{provider}" {{
  region = var.region
}}

variable "region" {{
  description = "Cloud region"
  type        = string
  default     = "us-east-1"
}}

variable "environment" {{
  description = "Environment name"
  type        = string
  default     = "dev"
}}

# Add your resources here based on: {data.get('description', '')}
# Example:
# resource "{provider}_example" "main" {{
#   # Configuration goes here
#   tags = {{
#     Environment = var.environment
#   }}
# }}'''
            explanation = f"Basic {provider} provider configuration with common variables"
            resources = ["provider_configuration"]
        
        return {
            'code': code,
            'explanation': explanation,
            'resources': resources,
            'estimated_cost': 'Cost estimation available in Pro version',
            'provider': provider,
            'generated_at': datetime.utcnow().isoformat()
        }

    def validate_terraform_code(self, code):
        """Validate Terraform code and provide suggestions"""
        if not code.strip():
            return {
                'valid': False,
                'issues': ['Code is empty'],
                'suggestions': ['Please provide Terraform code to validate']
            }
        
        issues = []
        suggestions = []
        warnings = []
        
        # Basic syntax checks
        if 'resource' not in code and 'data' not in code and 'module' not in code:
            issues.append('No resources, data sources, or modules defined')
        
        # Security checks
        if '0.0.0.0/0' in code:
            warnings.append('⚠️ Security Warning: Found open CIDR block (0.0.0.0/0)')
            suggestions.append('Consider restricting CIDR blocks to specific IP ranges')
        
        if 'password' in code.lower() and '"' in code:
            warnings.append('⚠️ Security Warning: Possible hardcoded password detected')
            suggestions.append('Use variables or secret management for sensitive values')
        
        if 'access_key' in code.lower():
            warnings.append('⚠️ Security Warning: Possible hardcoded access key detected')
            suggestions.append('Use IAM roles instead of hardcoded credentials')
        
        # Best practices
        if 'tags' not in code:
            suggestions.append('💡 Add tags to resources for better organization and cost tracking')
        
        if 'variable' not in code and len(code) > 200:
            suggestions.append('💡 Consider using variables to make configuration more reusable')
        
        if 'output' not in code:
            suggestions.append('💡 Add outputs to expose important resource information')
        
        if code.count('resource') > 3 and 'module' not in code:
            suggestions.append('💡 Consider organizing resources into modules for better maintainability')
        
        # Combine issues and warnings
        all_issues = issues + warnings
        
        return {
            'valid': len(issues) == 0,  # Only hard issues make it invalid
            'issues': all_issues,
            'suggestions': suggestions[:5],  # Limit suggestions
            'security_score': max(0, 100 - len(warnings) * 20),
            'best_practices_score': max(0, 100 - len([s for s in suggestions if '💡' in s]) * 15)
        }

    def register_user(self, data):
        """Register a new user (mock implementation)"""
        email = data.get('email', '')
        name = data.get('name', '')
        password = data.get('password', '')
        
        if not all([email, name, password]):
            return {'error': 'Email, name, and password are required'}
        
        # Mock user creation
        user_id = base64.b64encode(email.encode()).decode()[:12]
        
        return {
            'message': 'User registered successfully',
            'user': {
                'id': user_id,
                'email': email,
                'name': name
            },
            'access_token': f'mock_token_{user_id}',
            'token_type': 'bearer'
        }

    def login_user(self, data):
        """Login user (mock implementation)"""
        email = data.get('email', '')
        password = data.get('password', '')
        
        if not all([email, password]):
            return {'error': 'Email and password are required'}
        
        # Mock login
        user_id = base64.b64encode(email.encode()).decode()[:12]
        
        return {
            'message': 'Login successful',
            'user': {
                'id': user_id,
                'email': email,
                'name': email.split('@')[0].title()
            },
            'access_token': f'mock_token_{user_id}',
            'token_type': 'bearer'
        }

    def create_project(self, data):
        """Create a project (mock implementation)"""
        name = data.get('name', '')
        description = data.get('description', '')
        terraform_code = data.get('terraform_code', '')
        
        if not all([name, terraform_code]):
            return {'error': 'Name and terraform_code are required'}
        
        project_id = hashlib.md5(f"{name}{datetime.utcnow()}".encode()).hexdigest()[:8]
        
        return {
            'id': project_id,
            'name': name,
            'description': description,
            'terraform_code': terraform_code,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }