# Reactome Simulator - Cellular Management Game

A realistic cellular biology simulation game where you manage the complex molecular processes of a living cell. Guide your cell through metabolic pathways, energy production, waste management, and ultimately achieve cellular reproduction - all while facing the challenges that real cells encounter every day.

## 🧬 Game Features

### Core Cellular Processes
- **Energy Production**: Glycolysis, cellular respiration, and fermentation pathways
- **Biosynthesis**: Protein, lipid, nucleotide, and organelle production
- **Transport Systems**: Glucose uptake, oxygen transport, and waste removal
- **Cell Growth**: DNA replication, enzyme production, and organelle biogenesis
- **Cell Division**: The ultimate goal - successfully reproduce your cell

### Advanced Cellular Systems (Unlocked after Day 2)
- **Stress Response**: Heat shock proteins and antioxidant production
- **DNA Repair**: Fix accumulated genetic damage
- **Autophagy**: Emergency recycling of cellular components
- **Stress Adaptation**: Comprehensive cellular protection systems

### Realistic Biology
- **16+ Molecule Types**: From basic glucose and ATP to complex proteins and enzymes
- **Molecular Death Conditions**: Die when waste ≥200 or CO₂ ≥120, just like real cells
- **Metabolic Flexibility**: Switch between aerobic and anaerobic pathways based on conditions
- **Resource Management**: Each molecule has realistic capacities and consumption rates
- **Process Dependencies**: Complex biochemical pathways with realistic requirements

## 🎮 How to Play

### Getting Started
1. **Survive**: Keep your cell alive by managing energy (ATP) and waste products
2. **Balance Resources**: Monitor glucose, oxygen, and other critical molecules
3. **Run Processes**: Click cellular process buttons to activate metabolic pathways
4. **Optimize Efficiency**: Build enzymes and organelles to improve process performance
5. **Grow and Divide**: Accumulate enough resources to achieve cell division

### Key Strategies
- **Energy Management**: Run glycolysis for quick ATP, respiration for efficient ATP
- **Waste Control**: Use waste removal and ensure CO₂ doesn't accumulate
- **Growth Phase**: Build proteins and organelles to increase cellular capacity
- **Division Timing**: Carefully time cell division when you have sufficient resources

### Time Controls
- **Pause**: Space bar or ⏸ button
- **Speed Control**: 1-5x speed options for different gameplay paces
- **Keyboard Shortcuts**: 1=Normal, 2=Fast, 3=Slow, 4=Very Fast

## 📊 Molecular Systems

### Essential Molecules
- **Glucose**: Primary energy source (critical < 5, target 10+)
- **Oxygen**: Required for efficient respiration (critical < 3, target 8+)  
- **ATP**: Cellular energy currency (critical < 5, target 15+)
- **Water**: Essential for all cellular processes
- **Waste**: Must be kept below 200 to avoid death

### Intermediate Molecules
- **Pyruvate**: Bridge between glycolysis and respiration
- **Amino Acids**: Building blocks for protein synthesis
- **Nucleotides**: Required for DNA/RNA synthesis
- **Lipids**: Membrane components and energy storage

### Advanced Molecules (Late Game)
- **Heat Shock Proteins**: Protection against temperature stress
- **Antioxidants**: Defense against oxidative damage
- **Damaged Proteins**: Accumulated cellular damage requiring cleanup
- **DNA Damage**: Genetic damage that needs repair

## 🔬 Biological Accuracy

### Real Cellular Processes
- **Glycolysis**: Converts 1 glucose → 2 ATP + 2 pyruvate (anaerobic)
- **Cellular Respiration**: 2 pyruvate + 6 oxygen → 28 ATP + 6 CO₂ + 6 water
- **Fermentation**: Emergency anaerobic pathway producing waste
- **Protein Synthesis**: Amino acids + ATP + RNA → Proteins
- **DNA Replication**: High-energy process requiring nucleotides and ATP

### Death Conditions
Based on real cellular biology:
- **Waste Toxicity**: Death when waste ≥ 200 (cellular poisoning)
- **CO₂ Poisoning**: Death when CO₂ ≥ 120 (respiratory acidosis)
- **Energy Depletion**: Death when ATP < 0 (cellular energy crisis)

### Metabolic Pathways
- **Aerobic Respiration**: Highly efficient but requires oxygen
- **Anaerobic Fermentation**: Less efficient but oxygen-independent
- **Metabolic Switching**: Cells automatically adapt to available resources

## 🛠️ Technical Details

### Built With
- **Phaser 3.90.0**: Modern HTML5 game framework
- **TypeScript 5.9.2**: Type-safe development
- **Vite**: Fast development and build tools
- **Modern Web Standards**: Runs in any modern browser

### Architecture
- **Component-Based**: Modular cellular process system
- **Real-Time Simulation**: Continuous molecular updates
- **Responsive UI**: Adaptive interface for different screen sizes
- **Type Safety**: Full TypeScript implementation prevents runtime errors

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Quick Start
```bash
# Clone the repository
git clone https://github.com/your-username/reactome-sim.git
cd reactome-sim

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Development Server
```bash
npm run dev
# Open http://localhost:5173 in your browser
```

### Project Structure
```
reactome-sim/
├── src/
│   ├── scenes/
│   │   └── CellManagementGame.ts    # Main game logic
│   ├── types/
│   │   └── game-types.ts            # TypeScript interfaces
│   └── main.ts                      # Application entry point
├── public/                          # Static assets
├── package.json                     # Dependencies and scripts
└── README.md                        # This file
```

## 🎯 Game Goals & Achievements

### Short-Term Goals
- Survive your first day
- Successfully run all basic metabolic processes
- Build your first organelle
- Accumulate 100+ ATP

### Medium-Term Goals  
- Survive 3 days
- Unlock advanced cellular systems
- Successfully handle stress events
- Build a complete enzyme complement

### Ultimate Goal
- **Cell Division**: Successfully accumulate enough resources and organize cellular machinery to divide into two viable cells

### Victory Condition
Successfully survive 7 days OR achieve cell division - proving your mastery of cellular biology!

## 🧪 Educational Value

### Learn Real Biology
- **Metabolic Pathways**: Understand how cells generate energy
- **Biosynthesis**: Learn how cells build complex molecules
- **Cellular Stress**: Discover how cells respond to environmental challenges
- **Cell Division**: Experience the complexity of cellular reproduction

### Biochemistry Concepts
- **ATP Energy Currency**: Why cells need constant energy
- **Enzyme Function**: How biological catalysts accelerate reactions
- **Membrane Transport**: How molecules move in and out of cells
- **Metabolic Regulation**: How cells balance competing processes

## 🤝 Contributing

We welcome contributions to improve the biological accuracy, add new cellular processes, or enhance the gameplay experience!

### Development Guidelines
- Follow existing TypeScript/code style
- Ensure biological accuracy in new processes
- Add appropriate error handling
- Include descriptive comments for complex biology

### Suggested Improvements
- Additional stress response pathways
- Cell cycle checkpoints and regulation
- Organelle-specific processes (mitochondrial, ER, Golgi)
- Cell signaling and communication systems
- Circadian rhythm effects on cellular processes

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Real Cell Biology**: Inspired by decades of cellular biology research
- **Educational Goal**: Making complex biochemistry accessible through interactive gameplay
- **Open Source**: Built with amazing open-source tools and libraries

## 🐛 Bug Reports & Feature Requests

Please report issues or suggest features through GitHub Issues. Include:
- Clear description of the issue/feature
- Steps to reproduce (for bugs)
- Biological rationale (for new features)
- Screenshots if applicable

---

**Ready to master cellular life? Start your simulation and see if you can successfully grow and divide a virtual cell using real biochemical processes!**
