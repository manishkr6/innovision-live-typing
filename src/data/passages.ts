import { Passage, DifficultyLevel } from '../types';

export const PASSAGES: Passage[] = [
  // --- EASY (6 passages) ---
  {
    id: 'easy-1',
    title: 'Dawn Over Kangchenjunga',
    difficulty: 'Easy',
    category: 'Himalayan Sikkim',
    text: "At 05:30 AM, the first rays of sunlight strike Mt. Kangchenjunga (8,586 meters). Morning mist drifts gently across the Teesta Valley, while prayer flags flutter in the brisk breeze: red, blue, yellow, white, and green! Every student at ICFAI Sikkim knows this sacred view well.",
    charCount: 285,
    wordCount: 47,
  },
  {
    id: 'easy-2',
    title: 'Welcome to INNOVISION 2026',
    difficulty: 'Easy',
    category: 'Campus Life',
    text: "Welcome to INNOVISION 2026, hosted by the Faculty of Science & Technology! Over 300 energetic participants have gathered today. Are you ready to push your fingers to the limit? Remember: speed matters, but precision will crown the true champion.",
    charCount: 247,
    wordCount: 39,
  },
  {
    id: 'easy-3',
    title: 'The Mechanical Keyboard',
    difficulty: 'Easy',
    category: 'Tech & Innovation',
    text: "Click, clack, tap! Mechanical switches - whether linear red, tactile brown, or clicky blue - offer distinct tactile feedback. When typing at 80+ words per minute, your muscle memory takes over completely, turning pure thought into crisp digital prose.",
    charCount: 251,
    wordCount: 39,
  },
  {
    id: 'easy-4',
    title: 'Organic Tea Gardens of Temi',
    difficulty: 'Easy',
    category: 'Himalayan Sikkim',
    text: "Established in 1969, Temi Tea Estate is Sikkim's sole tea garden, producing world-class organic golden tips. Visitors ask: 'What makes this brew so fragrant?' The answer lies in high altitude (1,400 to 2,000 meters) and cool Himalayan mountain air.",
    charCount: 252,
    wordCount: 40,
  },
  {
    id: 'easy-5',
    title: 'Clean Code Principles',
    difficulty: 'Easy',
    category: 'Algorithms & Computing',
    text: "Good code is its own best documentation! As you write functions, keep them small, modular, and focused on a single task. Always ask yourself: 'Will my teammate understand this logic tomorrow?' If not, refactor it immediately.",
    charCount: 228,
    wordCount: 36,
  },
  {
    id: 'easy-6',
    title: 'Campus Cafeteria Debates',
    difficulty: 'Easy',
    category: 'Campus Life',
    text: "Between 01:15 PM and 02:00 PM, the university canteen buzzes with high-energy debates. Hot steamed momos, spicy dalle chili chutney, and steaming mugs of masala chai fuel passionate arguments about neural nets, gaming rigs, and upcoming semester exams!",
    charCount: 257,
    wordCount: 38,
  },

  // --- MEDIUM (6 passages) ---
  {
    id: 'med-1',
    title: 'Neural Networks & Deep Learning',
    difficulty: 'Medium',
    category: 'Tech & Innovation',
    text: "Modern artificial intelligence relies on multi-layer perceptrons, convolutional kernels, and transformer self-attention blocks. In 2017, the breakthrough paper 'Attention Is All You Need' sparked a revolution: models scaled from millions to 100+ billion parameters! Yet, can silicon ever mirror human consciousness?",
    charCount: 317,
    wordCount: 44,
  },
  {
    id: 'med-2',
    title: 'Gangtok: Ridge-Top Innovation',
    difficulty: 'Medium',
    category: 'Himalayan Sikkim',
    text: "Perched along a cloud-kissed ridge at 1,650 meters, Gangtok blends ancient Buddhist stupas with high-speed fiber-optic corridors. Sikkim became India's first 100% organic state in 2016; today, eco-entrepreneurs leverage IoT sensors and edge analytics to track sustainable agriculture across all six districts.",
    charCount: 310,
    wordCount: 43,
  },
  {
    id: 'med-3',
    title: 'The Institution\'s Innovation Council',
    difficulty: 'Medium',
    category: 'Campus Life',
    text: "Under the Ministry of Education's guidelines, the IIC at ICFAI University Sikkim catalyzes student-led startups. From patent drafting workshops to hackathons, the goal is unambiguous: 'Transform classroom theoretical knowledge into viable socio-economic ventures that uplift our local mountain communities.'",
    charCount: 311,
    wordCount: 41,
  },
  {
    id: 'med-4',
    title: 'Distributed Consensus & Blockchain',
    difficulty: 'Medium',
    category: 'Algorithms & Computing',
    text: "Solving the Byzantine Generals Problem required a paradigm shift: Proof-of-Work (PoW) versus Proof-of-Stake (PoS). When Node_A broadcasts block #14,029, peers verify cryptographic hashes (SHA-256) before appending records to the immutable ledger. No central intermediary; pure mathematical trust!",
    charCount: 304,
    wordCount: 40,
  },
  {
    id: 'med-5',
    title: 'Quantum Entanglement & Qubits',
    difficulty: 'Medium',
    category: 'Tech & Innovation',
    text: "Unlike classical bits (strictly 0 or 1), a quantum bit exists in a coherent superposition: |psi> = a|0> + b|1>. When two particles become entangled, Einstein famously questioned: 'Can spooky action at a distance truly govern our physical universe?' Experiments in 2022 confirmed Bell's inequality violations beyond doubt.",
    charCount: 325,
    wordCount: 49,
  },
  {
    id: 'med-6',
    title: 'The Great Himalayan Ecosystem',
    difficulty: 'Medium',
    category: 'Himalayan Sikkim',
    text: "Sikkim harbors over 5,500 species of flowering plants, 550+ bird varieties, and the elusive snow leopard (Panthera uncia). Glaciologists monitor Tsomgo Lake (altitude: 3,753m) and Gurudongmar Lake (altitude: 5,430m); satellite telemetry indicates real-time variations in seasonal permafrost and meltwater runoff.",
    charCount: 312,
    wordCount: 42,
  },

  // --- HARD (6 passages) ---
  {
    id: 'hard-1',
    title: 'Kernel Architecture & Memory Management',
    difficulty: 'Hard',
    category: 'Algorithms & Computing',
    text: "In POSIX-compliant kernels, virtual memory paging uses multi-level page tables (PML4/5). When a process encounters page fault 0x00007FFF_E29A, the MMU checks the CR3 register: Is the PTE's 'Present' bit set (0x01)? If not, the OS scheduler triggers an interrupt-handler: swap-in from disk or issue SIGSEGV!",
    charCount: 308,
    wordCount: 47,
  },
  {
    id: 'hard-2',
    title: 'Full-Stack Asynchronous Event Loops',
    difficulty: 'Hard',
    category: 'Tech & Innovation',
    text: "Consider JavaScript's V8 microtask queue: `Promise.resolve().then(() => console.log('Resolved!'));` executes prior to `setTimeout(fn, 0)`. When WebSocket frames arrive at 1,000 req/sec (via HTTP/2 multiplexing), backpressure handling - using reactive streams (RxJS) or async iterators - prevents heap exhaustion (OOM).",
    charCount: 318,
    wordCount: 41,
  },
  {
    id: 'hard-3',
    title: 'Cryptographic Nonces & Zero-Knowledge',
    difficulty: 'Hard',
    category: 'Algorithms & Computing',
    text: "zk-SNARKs (Zero-Knowledge Succinct Non-Interactive Arguments of Knowledge) allow Prover 'P' to convince Verifier 'V' that polynomial P(x) = 0 mod q without leaking secret 'w'. Using pairing-friendly elliptic curves (e.g., BN-254 & BLS12-381), proof verification takes <10ms; O(1) space, but high setup rigor!",
    charCount: 315,
    wordCount: 45,
  },
  {
    id: 'hard-4',
    title: 'Himalayan Biodiversity & Genomic Sequencing',
    difficulty: 'Hard',
    category: 'Himalayan Sikkim',
    text: "Researchers from FST-ICFAI extracted high-molecular-weight DNA (260/280 ratio ~ 1.85) from medicinal flora found in Singalila Ridge. Using Oxford Nanopore's MinION flow-cells, long-read sequencing yielded N50 > 45.2 kb: 'De novo assembly revealed 12 novel terpene-synthase gene clusters,' noted the lead bioinformatician.",
    charCount: 326,
    wordCount: 44,
  },
  {
    id: 'hard-5',
    title: 'Compiler Optimization & AST Transformations',
    difficulty: 'Hard',
    category: 'Algorithms & Computing',
    text: "During SSA (Static Single Assignment) generation, the LLVM optimizer applies dead-code elimination, loop-unrolling (factor: 4x), and SIMD vectorization (AVX-512). Notice: if pointer aliasing is undetectable, `#pragma clang loop vectorize(enable)` forces hardware register utilization, slashing latency by ~38.4%!",
    charCount: 320,
    wordCount: 41,
  },
  {
    id: 'hard-6',
    title: 'Autonomous Robotics & SLAM in Rugged Terrain',
    difficulty: 'Hard',
    category: 'Tech & Innovation',
    text: "Navigating mountain switchbacks requires real-time 3D LiDAR SLAM (Simultaneous Localization and Mapping). An Extended Kalman Filter (EKF) fuses IMU accelerations with wheel-encoder odometry: x_{k|k} = x_{k|k-1} + K_k (z_k - H_k * x_{k|k-1}). When GPS signals drop in deep gorges, precision drops by <2.5 centimeters!",
    charCount: 326,
    wordCount: 46,
  },
];

export function getPassagesByDifficulty(difficulty: DifficultyLevel): Passage[] {
  return PASSAGES.filter(p => p.difficulty === difficulty);
}

export function getRandomPassage(difficulty?: DifficultyLevel): Passage {
  const pool = difficulty ? getPassagesByDifficulty(difficulty) : PASSAGES;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}
