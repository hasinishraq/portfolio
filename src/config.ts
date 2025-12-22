export const siteConfig = {
  name: "Hasin Ishraq",
  title: "A Final Year Computer Science Student",
  description: "Portfolio website of Hasin Ishraq",
  accentColor: "#1d4ed8",
  social: {
    email: "hasinishraq26@gmail.com",
    linkedin: "https://www.linkedin.com/in/md-hasin-ishraq/",
    twitter: "https://x.com/hasinishraq",
    github: "https://github.com/hasinishraq",
  },
  resume: {
    label: "View Resume",
    url: "/resume",
  },
  aboutMe: `I'm a final-year Computer Science student passionate about Artificial Intelligence, Machine Learning, NLP, and RAG-based systems. I've built a solid foundation in core CS concepts and enjoy creating projects that blend AI with real-world problem-solving—whether through ML models, NLP workflows, or retrieval-augmented generation.

    Driven by curiosity, I continuously explore new technologies and stay updated with the fast-moving AI field. As I move into my professional journey, I'm excited to apply my skills, creativity, and enthusiasm to meaningful, innovative projects.`,
  skills: [
    "C",
    "C++",
    "Java",
    "Python",
    "SQL",
    "React",
    "Next.js",
    "Express",
    "Spring Boot",
    "OpenCV",
    "NumPy",
    "Pandas",
    "TensorFlow",
    "PyTorch",
    "PostgreSQL",
    "MySQL",
    "MongoDB",
    "Git",
    "Docker",
    "Linux",
  ],
  techStack: [
    {
      category: "Programming Languages",
      items: ["C", "C++", "Java", "Python","JavaScript","PHP","SQL"],
    },
    {
      category: "Frameworks & Libraries",
      items: [
        "React",
        "Next.js",
        "Express",
        "Spring Boot",
        "OpenCV",
        "NumPy",
        "Pandas",
        "TensorFlow",
        "PyTorch",
        "YOLO",
      ],
    },
    {
      category: "Databases",
      items: ["PostgreSQL", "MySQL", "MongoDB"],
    },
    {
      category: "Tools & Platforms",
      items: ["Git", "Docker", "Linux", "AWS", "Azure"],
    },
  ],
  projects: [
    {
      name: "Algorithm Visualizer",
      description:
        "Interactive playground that demonstrates sorting, pathfinding, and tree/graph algorithms with synced pseudocode, sliders, and 3D visuals.",
      link: "/algorithm-playground",
      skills: ["Astro", "React", "Three.js", "Tailwind CSS"],
    },
    {
      name: "FundBridge",
      description:
        "Peer-to-peer lending and crowdfunding platform that lets users securely invest or raise funds through an integrated payment gateway.",
      link: "https://github.com/hasinishraq/fund_bridge",
      skills: ["PHP", "MySQL", "HTML", "CSS", "JavaScript"],
    },
    {
      name: "Autonomous Road Inspection Robot",
      description:
        "Self-navigating robot that detects potholes and cracks using a custom-trained YOLO model, logs coordinates on a live map, and returns to base autonomously.",
      link: "https://github.com/hasinishraq/Microprocessor-Lab-Project",
      skills: ["Python", "OpenCV", "YOLO", "Arduino", "Raspberry Pi"],
    },
  ],
  experience: [],
  education: [
    {
      school: "United International University",
      degree: "Bachelor of Computer Science & Engineering",
      dateRange: "2022 - Present",
      achievements: [
        "CGPA: 3.77 / 4.00",
        "Coursework: AI, Machine Learning, NLP, Data Structures, Algorithms",
        "Active in AI/ML labs and research initiatives",
      ],
    },
  ],
};
