// services/MermaidChartService.js
import axios from 'axios';

class MermaidChartService {
  constructor() {
    this.baseURL = 'https://api.mermaidchart.com';
    this.liveEditorURL = 'https://mermaid.live';
  }

  /**
   * Create a shareable link using mermaid.live
   * @param {string} mermaidCode - The Mermaid diagram code
   * @param {object} options - Configuration options
   * @returns {string} Shareable URL
   */
  createLiveEditorLink(mermaidCode, options = {}) {
    try {
      const config = {
        code: mermaidCode,
        mermaid: {
          theme: options.theme || 'dark',
          themeVariables: {
            primaryColor: options.primaryColor || '#10b981',
            primaryTextColor: options.primaryTextColor || '#f1f5f9',
            primaryBorderColor: options.primaryBorderColor || '#059669',
            lineColor: options.lineColor || '#64748b',
            secondaryColor: options.secondaryColor || '#1e293b',
            tertiaryColor: options.tertiaryColor || '#334155'
          }
        },
        autoSync: true,
        updateEditor: false
      };

      // Encode the configuration for the URL
      const encodedConfig = btoa(JSON.stringify(config));
      return `${this.liveEditorURL}/edit#pako:${encodedConfig}`;
    } catch (error) {
      console.error('Error creating live editor link:', error);
      // Fallback to simple encoding
      const simpleEncoded = encodeURIComponent(mermaidCode);
      return `${this.liveEditorURL}/edit#${simpleEncoded}`;
    }
  }

  /**
   * Create a PNG image URL from Mermaid code
   * @param {string} mermaidCode - The Mermaid diagram code
   * @param {object} options - Image options
   * @returns {string} Image URL
   */
  createImageURL(mermaidCode, options = {}) {
    const config = {
      code: mermaidCode,
      mermaid: {
        theme: options.theme || 'dark'
      }
    };

    const encodedConfig = btoa(JSON.stringify(config));
    return `${this.liveEditorURL}/img/${encodedConfig}`;
  }

  /**
   * Validate Mermaid syntax
   * @param {string} mermaidCode - The Mermaid diagram code to validate
   * @returns {boolean} True if valid, false otherwise
   */
  validateMermaidSyntax(mermaidCode) {
    try {
      // Basic validation checks
      if (!mermaidCode || typeof mermaidCode !== 'string') {
        return false;
      }

      // Check for required diagram type declaration
      const validDiagramTypes = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt', 'pie', 'gitgraph'];
      const firstLine = mermaidCode.trim().split('\n')[0].toLowerCase();
      const hasValidType = validDiagramTypes.some(type => firstLine.startsWith(type));

      if (!hasValidType) {
        return false;
      }

      // Check for basic syntax issues
      const lines = mermaidCode.split('\n');
      for (let line of lines) {
        line = line.trim();
        if (line && !line.startsWith('%') && !line.startsWith('//')) {
          // Basic bracket matching for node definitions
          const openBrackets = (line.match(/\[/g) || []).length;
          const closeBrackets = (line.match(/\]/g) || []).length;
          if (openBrackets !== closeBrackets) {
            // Allow for some flexibility in complex diagrams
            continue;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error validating Mermaid syntax:', error);
      return false;
    }
  }

  /**
   * Enhance Mermaid code with better styling
   * @param {string} mermaidCode - Original Mermaid code
   * @param {string} provider - Cloud provider (aws, azure, gcp)
   * @returns {string} Enhanced Mermaid code with styling
   */
  enhanceMermaidCode(mermaidCode, provider = 'aws') {
    try {
      if (!this.validateMermaidSyntax(mermaidCode)) {
        return mermaidCode;
      }

      let enhancedCode = mermaidCode;

      // Add provider-specific styling
      const providerStyles = {
        aws: {
          primaryColor: '#FF9900',
          secondaryColor: '#232F3E',
          accentColor: '#4CAF50'
        },
        azure: {
          primaryColor: '#0078D4',
          secondaryColor: '#005A9E',
          accentColor: '#40E0D0'
        },
        gcp: {
          primaryColor: '#4285F4',
          secondaryColor: '#34A853',
          accentColor: '#FBBC04'
        }
      };

      const style = providerStyles[provider] || providerStyles.aws;

      // Add styling directive if not present
      if (!enhancedCode.includes('%%{') && !enhancedCode.includes('classDef')) {
        enhancedCode += `\n\n    classDef primary fill:${style.primaryColor},stroke:#fff,stroke-width:2px,color:#fff
    classDef secondary fill:${style.secondaryColor},stroke:#fff,stroke-width:1px,color:#fff
    classDef accent fill:${style.accentColor},stroke:#fff,stroke-width:2px,color:#000`;
      }

      return enhancedCode;
    } catch (error) {
      console.error('Error enhancing Mermaid code:', error);
      return mermaidCode;
    }
  }

  /**
   * Generate a preview thumbnail URL
   * @param {string} mermaidCode - The Mermaid diagram code
   * @returns {string} Thumbnail URL
   */
  createThumbnailURL(mermaidCode) {
    try {
      const config = {
        code: mermaidCode,
        mermaid: {
          theme: 'dark'
        }
      };

      const encodedConfig = btoa(JSON.stringify(config));
      return `${this.liveEditorURL}/img/${encodedConfig}?width=400&height=300`;
    } catch (error) {
      console.error('Error creating thumbnail URL:', error);
      return null;
    }
  }

  /**
   * Create multiple format URLs for download
   * @param {string} mermaidCode - The Mermaid diagram code
   * @returns {object} Object with different format URLs
   */
  createDownloadURLs(mermaidCode) {
    try {
      const config = {
        code: mermaidCode,
        mermaid: {
          theme: 'dark'
        }
      };

      const encodedConfig = btoa(JSON.stringify(config));
      const baseURL = `${this.liveEditorURL}/img/${encodedConfig}`;

      return {
        svg: `${baseURL}?format=svg`,
        png: `${baseURL}?format=png`,
        pdf: `${baseURL}?format=pdf`,
        jpeg: `${baseURL}?format=jpeg`
      };
    } catch (error) {
      console.error('Error creating download URLs:', error);
      return {};
    }
  }

  /**
   * Parse Mermaid code to extract components and relationships
   * @param {string} mermaidCode - The Mermaid diagram code
   * @returns {object} Parsed components and relationships
   */
  parseMermaidDiagram(mermaidCode) {
    try {
      const components = new Set();
      const relationships = [];

      const lines = mermaidCode.split('\n');
      
      for (let line of lines) {
        line = line.trim();
        
        // Skip comments and empty lines
        if (!line || line.startsWith('%') || line.startsWith('//') || line.startsWith('graph') || line.startsWith('flowchart')) {
          continue;
        }

        // Extract relationships (arrows)
        if (line.includes('-->') || line.includes('---') || line.includes('-.-')) {
          const arrowMatch = line.match(/(\w+)\s*[-=.]*>+\s*(\w+)/);
          if (arrowMatch) {
            const [, from, to] = arrowMatch;
            relationships.push({ from, to, type: 'connection' });
          }
        }

        // Extract node definitions
        const nodeMatches = line.matchAll(/(\w+)\[([^\]]+)\]/g);
        for (let match of nodeMatches) {
          const [, nodeId, nodeLabel] = match;
          components.add(nodeLabel);
        }

        // Extract simple node references
        const simpleNodeMatches = line.matchAll(/(\w+)\s*(?:\[|$)/g);
        for (let match of simpleNodeMatches) {
          const [, nodeId] = match;
          if (nodeId && nodeId.length > 0 && !['graph', 'TD', 'LR', 'TB', 'RL'].includes(nodeId)) {
            components.add(nodeId);
          }
        }
      }

      return {
        components: Array.from(components),
        relationships: relationships
      };
    } catch (error) {
      console.error('Error parsing Mermaid diagram:', error);
      return { components: [], relationships: [] };
    }
  }

  /**
   * Create an interactive editor link with custom configuration
   * @param {string} mermaidCode - The Mermaid diagram code
   * @param {object} editorConfig - Editor configuration
   * @returns {string} Interactive editor URL
   */
  createInteractiveEditorLink(mermaidCode, editorConfig = {}) {
    try {
      const config = {
        code: mermaidCode,
        mermaid: {
          theme: editorConfig.theme || 'dark',
          themeVariables: editorConfig.themeVariables || {},
          flowchart: {
            htmlLabels: true,
            curve: 'basis',
            ...editorConfig.flowchart
          }
        },
        autoSync: editorConfig.autoSync !== false,
        updateEditor: editorConfig.updateEditor !== false,
        panZoom: editorConfig.panZoom !== false
      };

      const encodedConfig = btoa(JSON.stringify(config));
      return `${this.liveEditorURL}/edit#pako:${encodedConfig}`;
    } catch (error) {
      console.error('Error creating interactive editor link:', error);
      return `${this.liveEditorURL}/edit`;
    }
  }
}

// Export singleton instance
export const mermaidChartService = new MermaidChartService();
export default mermaidChartService;