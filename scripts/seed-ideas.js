require('dotenv').config();
const mongoose = require('mongoose');
const { Idea } = require('../models');

const ideas = [
  // Blockchain ideas
  {
    title: "Blockchain-based Supply Chain",
    description: "Create a transparent supply chain solution using blockchain to track products from manufacturer to consumer. Implement smart contracts to automate verification and payment processes.",
    category: "blockchain",
    difficulty: "intermediate",
    tags: ["smart contracts", "ethereum", "traceability", "supply chain"],
    resources: [
      {
        title: "Ethereum Smart Contracts Documentation",
        url: "https://ethereum.org/en/developers/docs/smart-contracts/",
        type: "documentation"
      }
    ]
  },
  {
    title: "Decentralized Voting System",
    description: "Build a secure and transparent voting system using blockchain technology to ensure vote integrity and prevent fraud.",
    category: "blockchain",
    difficulty: "intermediate",
    tags: ["voting", "ethereum", "smart contracts", "dapp"],
    resources: [
      {
        title: "Building a Voting DApp Tutorial",
        url: "https://www.dappuniversity.com/articles/blockchain-voting-system-truffle-ganache",
        type: "tutorial"
      }
    ]
  },
  {
    title: "NFT Marketplace",
    description: "Develop a platform for creating, buying, and selling non-fungible tokens (NFTs) with support for various digital assets.",
    category: "blockchain",
    difficulty: "advanced",
    tags: ["nft", "marketplace", "ethereum", "web3"],
    resources: [
      {
        title: "OpenSea NFT Developer Documentation",
        url: "https://docs.opensea.io/",
        type: "documentation"
      }
    ]
  },

  // AI ideas
  {
    title: "AI-powered Code Reviewer",
    description: "Develop a tool that uses machine learning to review code, identify bugs, suggest improvements, and enforce coding standards.",
    category: "ai",
    difficulty: "advanced",
    tags: ["machine learning", "code quality", "static analysis", "nlp"],
    resources: [
      {
        title: "Building ML Models for Code Analysis",
        url: "https://github.blog/2019-09-26-introducing-github-code-scanning/",
        type: "article"
      }
    ]
  },
  {
    title: "Sentiment Analysis Dashboard",
    description: "Create a dashboard that analyzes sentiment from social media posts, reviews, or other text sources to help businesses understand public opinion.",
    category: "ai",
    difficulty: "intermediate",
    tags: ["nlp", "sentiment analysis", "dashboard", "data visualization"],
    resources: [
      {
        title: "NLTK Sentiment Analysis Tutorial",
        url: "https://www.nltk.org/howto/sentiment.html",
        type: "tutorial"
      }
    ]
  },
  {
    title: "Personal AI Assistant",
    description: "Build a voice-activated AI assistant that can perform tasks like setting reminders, answering questions, and controlling smart home devices.",
    category: "ai",
    difficulty: "advanced",
    tags: ["voice recognition", "nlp", "assistant", "automation"],
    resources: [
      {
        title: "Building Voice Assistants with Rasa",
        url: "https://rasa.com/docs/rasa/",
        type: "documentation"
      }
    ]
  },

  // Cloud ideas
  {
    title: "Serverless Image Processing Pipeline",
    description: "Build a scalable image processing system using serverless functions to handle uploads, transformations, and storage.",
    category: "cloud",
    difficulty: "intermediate",
    tags: ["serverless", "aws lambda", "image processing", "s3"],
    resources: [
      {
        title: "AWS Lambda Image Processing",
        url: "https://aws.amazon.com/blogs/compute/resize-images-on-the-fly-with-amazon-s3-aws-lambda-and-amazon-api-gateway/",
        type: "tutorial"
      }
    ]
  },
  {
    title: "Multi-Cloud Deployment Tool",
    description: "Create a tool that simplifies deploying applications across multiple cloud providers (AWS, Azure, GCP) with unified configuration.",
    category: "cloud",
    difficulty: "advanced",
    tags: ["multi-cloud", "devops", "infrastructure as code", "deployment"],
    resources: [
      {
        title: "Terraform Multi-Cloud Documentation",
        url: "https://www.terraform.io/docs/providers/index.html",
        type: "documentation"
      }
    ]
  },
  {
    title: "Cloud-based Real-time Collaboration Tool",
    description: "Develop a real-time document editing and collaboration platform using cloud services for synchronization and storage.",
    category: "cloud",
    difficulty: "intermediate",
    tags: ["real-time", "collaboration", "websockets", "document editing"],
    resources: [
      {
        title: "Building Real-time Apps with Firebase",
        url: "https://firebase.google.com/docs/database",
        type: "documentation"
      }
    ]
  },

  // Cybersecurity ideas
  {
    title: "Vulnerability Scanner",
    description: "Build a tool that scans web applications for common security vulnerabilities like SQL injection, XSS, and CSRF.",
    category: "cybersecurity",
    difficulty: "advanced",
    tags: ["security", "vulnerability", "scanning", "web security"],
    resources: [
      {
        title: "OWASP Top Ten",
        url: "https://owasp.org/www-project-top-ten/",
        type: "documentation"
      }
    ]
  },
  {
    title: "Password Manager",
    description: "Create a secure password manager that generates, stores, and auto-fills strong passwords with end-to-end encryption.",
    category: "cybersecurity",
    difficulty: "intermediate",
    tags: ["passwords", "encryption", "security", "authentication"],
    resources: [
      {
        title: "Cryptography for Password Storage",
        url: "https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html",
        type: "article"
      }
    ]
  },
  {
    title: "Network Traffic Analyzer",
    description: "Develop a tool that monitors and analyzes network traffic to detect suspicious activities and potential security threats.",
    category: "cybersecurity",
    difficulty: "advanced",
    tags: ["network security", "traffic analysis", "intrusion detection", "monitoring"],
    resources: [
      {
        title: "Wireshark Documentation",
        url: "https://www.wireshark.org/docs/",
        type: "documentation"
      }
    ]
  },

  // IoT ideas
  {
    title: "Smart Home Automation System",
    description: "Build a system to control and automate home devices like lights, thermostats, and security cameras through a central dashboard.",
    category: "iot",
    difficulty: "intermediate",
    tags: ["smart home", "automation", "raspberry pi", "sensors"],
    resources: [
      {
        title: "Home Assistant Documentation",
        url: "https://www.home-assistant.io/docs/",
        type: "documentation"
      }
    ]
  },
  {
    title: "Environmental Monitoring Station",
    description: "Create a network of sensors to monitor environmental conditions like temperature, humidity, air quality, and noise levels.",
    category: "iot",
    difficulty: "beginner",
    tags: ["environmental", "sensors", "monitoring", "arduino"],
    resources: [
      {
        title: "Arduino Sensor Tutorials",
        url: "https://www.arduino.cc/en/Tutorial/BuiltInExamples",
        type: "tutorial"
      }
    ]
  },
  {
    title: "IoT Fleet Management System",
    description: "Develop a system to track and manage a fleet of vehicles using IoT devices for location, fuel consumption, and maintenance monitoring.",
    category: "iot",
    difficulty: "advanced",
    tags: ["fleet management", "gps", "tracking", "telematics"],
    resources: [
      {
        title: "GPS Tracking with Arduino",
        url: "https://randomnerdtutorials.com/guide-to-neo-6m-gps-module-with-arduino/",
        type: "tutorial"
      }
    ]
  },

  // AR/VR ideas
  {
    title: "AR Navigation App",
    description: "Create an augmented reality app that overlays navigation directions on the real world through the camera view.",
    category: "ar-vr",
    difficulty: "intermediate",
    tags: ["augmented reality", "navigation", "mobile", "geolocation"],
    resources: [
      {
        title: "ARCore Documentation",
        url: "https://developers.google.com/ar",
        type: "documentation"
      }
    ]
  },
  {
    title: "VR Training Simulator",
    description: "Build a virtual reality training simulator for a specific profession or skill, such as medical procedures or equipment operation.",
    category: "ar-vr",
    difficulty: "advanced",
    tags: ["virtual reality", "training", "simulation", "education"],
    resources: [
      {
        title: "Unity VR Development",
        url: "https://docs.unity3d.com/Manual/VROverview.html",
        type: "documentation"
      }
    ]
  },
  {
    title: "AR Product Visualization",
    description: "Create an app that allows users to visualize products in their real environment before purchasing, such as furniture or decor.",
    category: "ar-vr",
    difficulty: "intermediate",
    tags: ["augmented reality", "e-commerce", "visualization", "3d modeling"],
    resources: [
      {
        title: "ARKit Documentation",
        url: "https://developer.apple.com/documentation/arkit",
        type: "documentation"
      }
    ]
  },

  // Web ideas
  {
    title: "Personal Portfolio Website",
    description: "Build a responsive portfolio website to showcase your projects, skills, and experience to potential employers or clients.",
    category: "web",
    difficulty: "beginner",
    tags: ["portfolio", "responsive", "frontend", "personal branding"],
    resources: [
      {
        title: "Modern CSS Techniques",
        url: "https://css-tricks.com/",
        type: "article"
      }
    ]
  },
  {
    title: "E-commerce Platform",
    description: "Create a full-featured online store with product listings, shopping cart, payment processing, and order management.",
    category: "web",
    difficulty: "intermediate",
    tags: ["e-commerce", "payments", "shopping cart", "product management"],
    resources: [
      {
        title: "Stripe Documentation",
        url: "https://stripe.com/docs",
        type: "documentation"
      }
    ]
  },
  {
    title: "Content Management System",
    description: "Build a custom CMS that allows non-technical users to create, edit, and publish content on a website without coding knowledge.",
    category: "web",
    difficulty: "intermediate",
    tags: ["cms", "content management", "admin panel", "wysiwyg"],
    resources: [
      {
        title: "Building a CMS with React",
        url: "https://reactjs.org/docs/thinking-in-react.html",
        type: "tutorial"
      }
    ]
  },

  // Mobile ideas
  {
    title: "Fitness Tracking App",
    description: "Develop a mobile app that tracks workouts, monitors progress, and provides personalized fitness recommendations.",
    category: "mobile",
    difficulty: "intermediate",
    tags: ["fitness", "health", "tracking", "personalization"],
    resources: [
      {
        title: "Health Kit Documentation",
        url: "https://developer.apple.com/documentation/healthkit",
        type: "documentation"
      }
    ]
  },
  {
    title: "Language Learning App",
    description: "Create an app that helps users learn new languages through interactive lessons, flashcards, and speech recognition.",
    category: "mobile",
    difficulty: "intermediate",
    tags: ["education", "languages", "speech recognition", "gamification"],
    resources: [
      {
        title: "Speech Recognition API",
        url: "https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition",
        type: "documentation"
      }
    ]
  },
  {
    title: "Local Event Discovery App",
    description: "Build an app that helps users discover events, activities, and places of interest in their local area.",
    category: "mobile",
    difficulty: "intermediate",
    tags: ["events", "local", "maps", "discovery"],
    resources: [
      {
        title: "Google Maps API Documentation",
        url: "https://developers.google.com/maps/documentation",
        type: "documentation"
      }
    ]
  }
];

// Function to seed the database
const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Clear existing ideas
    await Idea.deleteMany({});
    
    // Insert new ideas
    await Idea.insertMany(ideas);
    
    console.log('Database seeded successfully with project ideas!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seeding function
seedDatabase();
