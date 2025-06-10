export interface Resource {
  title: string;
  url: string;
  type: 'article' | 'video' | 'tutorial' | 'github' | 'documentation' | 'other';
}

export interface Idea {
  _id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  resources: Resource[];
  createdAt: string;
  updatedAt: string;
}

export interface CategoryInfo {
  name: string;
  displayName: string;
  icon: string;
  description: string;
  color: string;
}

export const CATEGORIES: { [key: string]: CategoryInfo } = {
  'blockchain': {
    name: 'blockchain',
    displayName: 'Blockchain',
    icon: 'fa-link-horizontal',
    description: 'Decentralized applications, smart contracts, and distributed ledger technologies',
    color: '#F7931A' // Bitcoin orange
  },
  'ai': {
    name: 'ai',
    displayName: 'Artificial Intelligence',
    icon: 'fa-brain',
    description: 'Machine learning, natural language processing, and intelligent systems',
    color: '#00A67E' // Teal
  },
  'cloud': {
    name: 'cloud',
    displayName: 'Cloud Computing',
    icon: 'fa-cloud',
    description: 'Serverless, microservices, and cloud-native applications',
    color: '#0078D4' // Azure blue
  },
  'cybersecurity': {
    name: 'cybersecurity',
    displayName: 'Cybersecurity',
    icon: 'fa-shield-alt',
    description: 'Security tools, encryption, and vulnerability analysis',
    color: '#D93025' // Red
  },
  'iot': {
    name: 'iot',
    displayName: 'Internet of Things',
    icon: 'fa-microchip',
    description: 'Connected devices, sensors, and smart systems',
    color: '#4CAF50' // Green
  },
  'ar-vr': {
    name: 'ar-vr',
    displayName: 'AR/VR',
    icon: 'fa-vr-cardboard',
    description: 'Augmented and virtual reality experiences',
    color: '#9C27B0' // Purple
  },
  'quantum': {
    name: 'quantum',
    displayName: 'Quantum Computing',
    icon: 'fa-atom',
    description: 'Quantum algorithms, simulations, and applications',
    color: '#3F51B5' // Indigo
  },
  'devops': {
    name: 'devops',
    displayName: 'DevOps',
    icon: 'fa-code-branch',
    description: 'CI/CD pipelines, infrastructure as code, and automation',
    color: '#FF5722' // Deep orange
  },
  'data-science': {
    name: 'data-science',
    displayName: 'Data Science',
    icon: 'fa-chart-bar',
    description: 'Data analysis, visualization, and predictive modeling',
    color: '#2196F3' // Blue
  },
  'mobile': {
    name: 'mobile',
    displayName: 'Mobile Development',
    icon: 'fa-mobile-alt',
    description: 'Native and cross-platform mobile applications',
    color: '#607D8B' // Blue grey
  },
  'web': {
    name: 'web',
    displayName: 'Web Development',
    icon: 'fa-globe',
    description: 'Frontend, backend, and full-stack web applications',
    color: '#FF9800' // Orange
  },
  'game': {
    name: 'game',
    displayName: 'Game Development',
    icon: 'fa-gamepad',
    description: '2D/3D games, game engines, and interactive experiences',
    color: '#8BC34A' // Light green
  }
};
