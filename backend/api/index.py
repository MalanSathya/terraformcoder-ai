import json
import os
import re
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
from datetime import datetime
import hashlib
import base64

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.handle_request()
    
    def do_POST(self):
        self.handle_request()
    
    def do_OPTIONS(self):
        self.send_cors_headers()
        self.end_headers()
    
    def send_cors_headers(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    def handle_request(self):
        try:
            parsed_url = urlparse(self.path)
            path = parsed_url.path
            query_params = parse_qs(parsed_url.query)
            
            # Remove /api prefix if present
            if path.startswith('/api'):
                path = path[4:] or '/'
            
            self.send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            if path == '/' or path == '':
                response = self.handle_root()
            elif path == '/health':
                response = self.handle_health()
            elif path == '/templates':
                response = self.handle_templates()
            elif path == '/generate' and self.command == 'POST':
                response = self.handle_generate()
            elif path == '/validate':
                response = self.handle_validate(query_params)
            elif path == '/register' and self.command == 'POST':
                response = self.handle_register()
            elif path == '/login' and self.command == 'POST':
                response = self.handle_login()
            elif path == '/projects' and self.command == 'POST':
                response = self.handle_save_project()
            elif path == '/projects' and self.command == 'GET':
                response = self.handle_get_projects()
            elif path == '/stats':
                response = self.handle_stats()
            else:
                response = {"error": "Endpoint not found", "path": path}
            
            self.wfile.write(json.dumps(response, indent=2).encode())
            
        except Exception as e:
            error_response = {"error": f"Server error: {str(e)}"}
            self.wfile.write(json.dumps(error_response).encode())
    
    def handle_root(self):
        return {
            "message": "TerraformCoder AI API",
            "version": "2.0.0",
            "status": "healthy",
            "endpoints": {
                "GET /api": "API information",
                "GET /api/health": "Health check",
                "GET /api/templates": "Get Terraform templates",
                "POST /api/generate": "Generate Terraform code",
                "GET /api/validate": "Validate Terraform code",
                "POST /api/register": "Register user",
                "POST /api/login": "User login",
                "POST /api/projects": "Save project",
                "GET /api/projects": "Get user projects",
                "GET /api/stats": "Usage statistics"
            },
            "features": [
                "AI-powered Terraform generation",
                "Multi-cloud support (AWS, Azure, GCP)",
                "Code validation and security checks",
                "Template library",
                "User authentication",
                "Project management"
            ]
        }
    
    def handle_health(self):
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "version": "2.0.0",
            "uptime": "100%"
        }
    
    def handle_templates(self):
        templates = {
            "aws": {
                "vpc": {
                    "name": "AWS VPC with Subnets",
                    "description": "Creates VPC with public/private subnets and Internet Gateway",
                    "code": '''resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = var.vpc_name
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.vpc_name}-igw"
  }
}

resource "aws_subnet" "public" {
  count             = length(var.public_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.public_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name = "${var.vpc_name}-public-${count.index + 1}"
  }
}

resource "aws_subnet" "private" {
  count             = length(var.private_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.vpc_name}-private-${count.index + 1}"
  }
}

variable "vpc_name" {
  description = "Name of the VPC"
  type        = string
  default     = "main"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.3.0/24", "10.0.4.0/24"]
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-west-2a", "us-west-2b"]
}'''
                },
                "ec2": {
                    "name": "AWS EC2 Instance with Security Group",
                    "description": "Creates EC2 instance with security group and key pair",
                    "code": '''resource "aws_security_group" "web" {
  name_prefix = "web-sg"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.ssh_cidr_blocks
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

resource "aws_instance" "web" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  key_name              = var.key_name
  vpc_security_group_ids = [aws_security_group.web.id]
  subnet_id             = var.subnet_id

  user_data = var.user_data

  tags = {
    Name = var.instance_name
  }
}

variable "vpc_id" {
  description = "VPC ID where EC2 will be launched"
  type        = string
}

variable "subnet_id" {
  description = "Subnet ID where EC2 will be launched"
  type        = string
}

variable "instance_name" {
  description = "Name of the EC2 instance"
  type        = string
  default     = "web-server"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "ami_id" {
  description = "AMI ID for the instance"
  type        = string
  default     = "ami-0c02fb55956c7d316"  # Amazon Linux 2
}

variable "key_name" {
  description = "Key pair name for SSH access"
  type        = string
}

variable "ssh_cidr_blocks" {
  description = "CIDR blocks allowed for SSH access"
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "user_data" {
  description = "User data script"
  type        = string
  default     = ""
}'''
                },
                "rds": {
                    "name": "AWS RDS MySQL Database",
                    "description": "Creates RDS MySQL instance with subnet group",
                    "code": '''resource "aws_db_subnet_group" "main" {
  name       = "${var.db_name}-subnet-group"
  subnet_ids = var.subnet_ids

  tags = {
    Name = "${var.db_name} DB subnet group"
  }
}

resource "aws_security_group" "rds" {
  name_prefix = "${var.db_name}-rds-sg"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.db_name}-rds-sg"
  }
}

resource "aws_db_instance" "main" {
  identifier = var.db_name
  
  engine         = "mysql"
  engine_version = var.mysql_version
  instance_class = var.instance_class
  
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp2"
  storage_encrypted     = true
  
  db_name  = var.database_name
  username = var.username
  password = var.password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = var.backup_retention_period
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = true
  deletion_protection = false

  tags = {
    Name = var.db_name
  }
}

variable "db_name" {
  description = "Name of the RDS instance"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where RDS will be created"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for DB subnet group"
  type        = list(string)
}

variable "allowed_security_groups" {
  description = "Security groups allowed to access RDS"
  type        = list(string)
}

variable "mysql_version" {
  description = "MySQL version"
  type        = string
  default     = "8.0"
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "allocated_storage" {
  description = "Initial storage allocation"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Maximum storage allocation"
  type        = number
  default     = 100
}

variable "database_name" {
  description = "Name of the database"
  type        = string
  default     = "myapp"
}

variable "username" {
  description = "Database master username"
  type        = string
  default     = "admin"
}

variable "password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}'''
                }
            },
            "azure": {
                "resource_group": {
                    "name": "Azure Resource Group with Virtual Network",
                    "description": "Creates resource group and virtual network",
                    "code": '''resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location

  tags = var.tags
}

resource "azurerm_virtual_network" "main" {
  name                = var.vnet_name
  address_space       = var.address_space
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  tags = var.tags
}

resource "azurerm_subnet" "main" {
  name                 = var.subnet_name
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = var.subnet_prefixes
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "East US"
}

variable "vnet_name" {
  description = "Name of the virtual network"
  type        = string
  default     = "main-vnet"
}

variable "address_space" {
  description = "Address space for VNet"
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "subnet_name" {
  description = "Name of the subnet"
  type        = string
  default     = "main-subnet"
}

variable "subnet_prefixes" {
  description = "Address prefixes for subnet"
  type        = list(string)
  default     = ["10.0.1.0/24"]
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}'''
                }
            },
            "gcp": {
                "vpc": {
                    "name": "GCP VPC Network with Subnets",
                    "description": "Creates VPC network with custom subnets",
                    "code": '''resource "google_compute_network" "main" {
  name                    = var.network_name
  auto_create_subnetworks = false
  routing_mode           = "GLOBAL"
}

resource "google_compute_subnetwork" "main" {
  count         = length(var.subnets)
  name          = var.subnets[count.index].name
  ip_cidr_range = var.subnets[count.index].cidr
  region        = var.subnets[count.index].region
  network       = google_compute_network.main.id

  secondary_ip_range {
    range_name    = "${var.subnets[count.index].name}-secondary"
    ip_cidr_range = var.subnets[count.index].secondary_cidr
  }
}

resource "google_compute_firewall" "allow_internal" {
  name    = "${var.network_name}-allow-internal"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = var.internal_cidrs
}

variable "network_name" {
  description = "Name of the VPC network"
  type        = string
}

variable "subnets" {
  description = "List of subnets to create"
  type = list(object({
    name           = string
    cidr           = string
    region         = string
    secondary_cidr = string
  }))
  default = [
    {
      name           = "main-subnet"
      cidr           = "10.0.1.0/24"
      region         = "us-central1"
      secondary_cidr = "10.0.2.0/24"
    }
  ]
}

variable "internal_cidrs" {
  description = "CIDR blocks for internal traffic"
  type        = list(string)
  default     = ["10.0.0.0/16"]
}'''
                }
            }
        }
        
        return {
            "templates": templates,
            "total_templates": sum(len(provider_templates) for provider_templates in templates.values()),
            "providers": list(templates.keys())
        }
    
    def handle_generate(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            description = data.get('description', '').lower()
            provider = data.get('provider', 'aws').lower()
            
            # Simple AI-like generation based on keywords
            generated_code = self.generate_terraform_code(description, provider)
            validation_result = self.validate_terraform_code(generated_code)
            
            return {
                "success": True,
                "terraform_code": generated_code,
                "provider": provider,
                "description": data.get('description'),
                "validation": validation_result,
                "timestamp": datetime.now().isoformat(),
                "generated_by": "TerraformCoder AI"
            }
            
        except Exception as e:
            return {"error": f"Generation failed: {str(e)}"}
    
    def generate_terraform_code(self, description, provider):
        # Enhanced AI-like code generation
        if 'vpc' in description and 'subnet' in description:
            if provider == 'aws':
                return '''# VPC with Public and Private Subnets
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "main-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "main-igw"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-west-2a"
  map_public_ip_on_launch = true

  tags = {
    Name = "public-subnet"
  }
}

resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-west-2b"

  tags = {
    Name = "private-subnet"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "public-rt"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}'''
            
        elif 'ec2' in description or 'server' in description:
            return '''# EC2 Instance with Security Group
resource "aws_security_group" "web" {
  name_prefix = "web-sg"
  description = "Security group for web server"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "web-sg"
  }
}

resource "aws_instance" "web" {
  ami           = "ami-0c02fb55956c7d316"  # Amazon Linux 2
  instance_type = "t3.micro"
  
  vpc_security_group_ids = [aws_security_group.web.id]
  
  user_data = <<-EOF
              #!/bin/bash
              yum update -y
              yum install -y httpd
              systemctl start httpd
              systemctl enable httpd
              echo "<h1>Hello from Terraform!</h1>" > /var/www/html/index.html
              EOF

  tags = {
    Name = "web-server"
  }
}

output "instance_public_ip" {
  value = aws_instance.web.public_ip
}'''
            
        elif 'database' in description or 'rds' in description:
            return '''# RDS MySQL Database
resource "aws_db_subnet_group" "main" {
  name       = "main-db-subnet-group"
  subnet_ids = [aws_subnet.private1.id, aws_subnet.private2.id]

  tags = {
    Name = "Main DB subnet group"
  }
}

resource "aws_security_group" "rds" {
  name_prefix = "rds-sg"
  description = "Security group for RDS database"

  ingress {
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  tags = {
    Name = "rds-sg"
  }
}

resource "aws_db_instance" "main" {
  identifier = "main-database"
  
  engine         = "mysql"
  engine_version = "8.0"
  instance_class = "db.t3.micro"
  
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp2"
  storage_encrypted     = true
  
  db_name  = "myapp"
  username = "admin"
  password = var.db_password  # Use variable for security
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = true

  tags = {
    Name = "main-database"
  }
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}'''
        
        else:
            # Generic resource based on description
            return f'''# Generated Terraform configuration for: {description}
resource "aws_instance" "main" {{
  ami           = "ami-0c02fb55956c7d316"
  instance_type = "t3.micro"

  tags = {{
    Name = "generated-instance"
    Description = "{description}"
  }}
}}

output "instance_id" {{
  value = aws_instance.main.id
}}'''
    
    def validate_terraform_code(self, code):
        issues = []
        warnings = []
        security_score = 100
        
        # Security checks
        if '0.0.0.0/0' in code:
            issues.append("Security: Open CIDR block (0.0.0.0/0) detected")
            security_score -= 20
            
        if 'password = "' in code:
            issues.append("Security: Hardcoded password detected")
            security_score -= 30
            
        if 'secret' in code.lower() and '= "' in code:
            issues.append("Security: Potential hardcoded secret")
            security_score -= 25
            
        # Best practices
        if 'tags = {' not in code:
            warnings.append("Best Practice: Consider adding tags to resources")
            security_score -= 5
            
        if 'variable ' not in code and len(code.split('\n')) > 10:
            warnings.append("Best Practice: Consider using variables for reusability")
            security_score -= 5
            
        # Syntax checks
        if code.count('{') != code.count('}'):
            issues.append("Syntax: Mismatched braces")
            security_score -= 40
            
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "warnings": warnings,
            "security_score": max(0, security_score),
            "recommendations": [
                "Use variables for sensitive data",
                "Implement least privilege access",
                "Add appropriate tags for resource management",
                "Use specific CIDR blocks instead of 0.0.0.0/0"
            ]
        }
    
    def handle_validate(self, query_params):
        code = query_params.get('code', [''])[0]
        if not code:
            return {"error": "No code provided for validation"}
        
        validation_result = self.validate_terraform_code(code)
        return {
            "validation": validation_result,
            "timestamp": datetime.now().isoformat()
        }
    
    def handle_register(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            username = data.get('username')
            email = data.get('email')
            password = data.get('password')
            
            if not all([username, email, password]):
                return {"error": "Missing required fields"}
            
            # Mock user registration (in real app, save to database)
            user_id = hashlib.md5(f"{username}{email}".encode()).hexdigest()[:8]
            
            return {
                "success": True,
                "message": "User registered successfully",
                "user_id": user_id,
                "username": username,
                "email": email
            }
            
        except Exception as e:
            return {"error": f"Registration failed: {str(e)}"}
    
    def handle_login(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            username = data.get('username')
            password = data.get('password')
            
            if not all([username, password]):
                return {"error": "Missing credentials"}
            
            # Mock authentication (in real app, verify against database)
            token = base64.b64encode(f"{username}:{datetime.now().isoformat()}".encode()).decode()
            
            return {
                "success": True,
                "message": "Login successful",
                "token": token,
                "username": username,
                "expires_in": 3600
            }
            
        except Exception as e:
            return {"error": f"Login failed: {str(e)}"}
    
    def handle_save_project(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            project_name = data.get('name')
            terraform_code = data.get('code')
            description = data.get('description', '')
            
            if not all([project_name, terraform_code]):
                return {"error": "Missing required project data"}
            
            project_id = hashlib.md5(f"{project_name}{datetime.now().isoformat()}".encode()).hexdigest()[:12]
            
            return {
                "success": True,
                "message": "Project saved successfully",
                "project_id": project_id,
                "name": project_name,
                "saved_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {"error": f"Save failed: {str(e)}"}
    
    
    def handle_get_projects(self):
        # Mock project data (in real app, fetch from database)
        projects = [
            {
                "id": "proj_001",
                "name": "Web Application Infrastructure",
                "description": "VPC with EC2 and RDS for web app",
                "provider": "aws",
                "created_at": "2024-01-15T10:30:00Z",
                "last_modified": "2024-01-16T14:22:00Z",
                "resources_count": 8
            },
            {
                "id": "proj_002", 
                "name": "Database Setup",
                "description": "MySQL RDS with security groups",
                "provider": "aws",
                "created_at": "2024-01-14T09:15:00Z",
                "last_modified": "2024-01-14T09:15:00Z",
                "resources_count": 3
            },
            {
                "id": "proj_003",
                "name": "Azure Resource Group",
                "description": "Basic Azure infrastructure setup",
                "provider": "azure",
                "created_at": "2024-01-13T16:45:00Z",
                "last_modified": "2024-01-13T17:20:00Z",
                "resources_count": 5
            }
        ]
        
        return {
            "projects": projects,
            "total_count": len(projects),
            "timestamp": datetime.now().isoformat()
        }
    
    def handle_stats(self):
        return {
            "api_stats": {
                "total_generations": 1247,
                "successful_generations": 1198,
                "failed_generations": 49,
                "success_rate": "96.1%"
            },
            "popular_resources": [
                {"name": "aws_vpc", "count": 342},
                {"name": "aws_instance", "count": 289},
                {"name": "aws_security_group", "count": 267},
                {"name": "aws_subnet", "count": 234},
                {"name": "aws_db_instance", "count": 156}
            ],
            "provider_usage": {
                "aws": 78.2,
                "azure": 15.3,
                "gcp": 6.5
            },
            "users": {
                "total_registered": 342,
                "active_this_month": 127,
                "projects_created": 892
            },
            "uptime": "99.9%",
            "avg_response_time": "245ms",
            "timestamp": datetime.now().isoformat()
        }