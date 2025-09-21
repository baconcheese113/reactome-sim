import { Enzyme, EnzymeType } from '../entities/Enzyme';
import { Molecule, MoleculeType } from '../entities/Molecule';
import { glycolysis_database } from './glycolysis-database';

export interface PathwayValidationResult {
  isValid: boolean;
  errors: string[];
  efficiency: number;
  completeness: number;
}

export class biochemical_validator {
  public static validatePathway(
    enzymes: Enzyme[],
    inputMolecules: Molecule[],
    targetProducts: MoleculeType[]
  ): PathwayValidationResult {
    const errors: string[] = [];
    let totalEnergyChange = 0;
    let validReactions = 0;

    // Get enzyme sequence from placed enzymes
    const enzymeSequence = enzymes
      .filter(e => e.isPlaced)
      .map(e => e.properties.type);

    // Validate using glycolysis database
    const sequenceValidation = glycolysis_database.validateStepSequence(enzymeSequence);
    
    if (!sequenceValidation.isValid) {
      errors.push(...sequenceValidation.errors);
    }

    // Check for missing critical steps
    if (sequenceValidation.missingSteps.length > 0) {
      const missingStepNames = sequenceValidation.missingSteps
        .map(stepNum => {
          const step = glycolysis_database.getStepByNumber(stepNum);
          return step ? `Step ${stepNum} (${step.enzyme})` : `Step ${stepNum}`;
        })
        .slice(0, 3); // Show max 3 missing steps
      
      errors.push(`Missing steps: ${missingStepNames.join(', ')}`);
    }

    // Validate each enzyme's substrates and products
    for (const enzyme of enzymes.filter(e => e.isPlaced)) {
      const glycolysisStep = glycolysis_database.getStepByEnzyme(enzyme.properties.type);
      
      if (!glycolysisStep) {
        errors.push(`Unknown glycolysis enzyme: ${enzyme.properties.type}`);
        continue;
      }

      // Check substrate availability (simplified for now)
      const availableSubstrates = this.getAvailableSubstrates(enzyme, inputMolecules, enzymes);
      const missingSubstrates = glycolysisStep.substrates.filter(
        substrate => !availableSubstrates.includes(substrate)
      );

      if (missingSubstrates.length > 0 && enzymeSequence.indexOf(enzyme.properties.type) === 0) {
        // Only check first enzyme for initial substrates
        if (!availableSubstrates.includes(MoleculeType.GLUCOSE) && 
            glycolysisStep.substrates.includes(MoleculeType.GLUCOSE)) {
          errors.push(`Missing glucose substrate for ${enzyme.properties.type}`);
        }
      }

      validReactions++;
      totalEnergyChange += glycolysisStep.energyChange;

      // Check for regulatory enzyme optimization
      if (glycolysisStep.isRegulatory) {
        const kinetics = glycolysis_database.getEnzymeKinetics(enzyme.properties.type);
        if (kinetics && kinetics.inhibitors.length > 0) {
          // Award bonus for understanding regulatory mechanisms
          totalEnergyChange -= 5; // Small energy bonus for regulatory awareness
        }
      }
    }

    // Check if pathway produces target products
    if (targetProducts.includes(MoleculeType.PYRUVATE) && enzymeSequence.length >= 5) {
      validReactions += 2; // Bonus for pathway completion
    }

    // Calculate metrics using glycolysis database
    const expectedTotalSteps = glycolysis_database.getGlycolysisSteps().length;
    const efficiency = this.calculateAdvancedEfficiency(
      totalEnergyChange, 
      validReactions, 
      enzymes.length,
      expectedTotalSteps
    );
    
    const completeness = validReactions / Math.max(expectedTotalSteps, 1);
    const isValid = errors.length === 0 && completeness > 0.6; // Lower threshold for complex pathway

    return {
      isValid,
      errors,
      efficiency,
      completeness,
    };
  }

  private static calculateAdvancedEfficiency(
    energyChange: number,
    validReactions: number,
    totalEnzymes: number,
    expectedSteps: number
  ): number {
    // Energy efficiency based on glycolysis thermodynamics
    const expectedEnergyChange = glycolysis_database.getTotalEnergyChange();
    const energyEfficiency = Math.max(0, 1 - Math.abs(energyChange - expectedEnergyChange) / 100);
    
    // Reaction completeness
    const reactionEfficiency = validReactions / Math.max(expectedSteps, 1);
    
    // Pathway optimization (penalize extra unnecessary enzymes)
    const optimizationPenalty = Math.max(0, (totalEnzymes - expectedSteps) * 0.1);
    
    return Math.max(0, (energyEfficiency * 0.4 + reactionEfficiency * 0.6 - optimizationPenalty) * 100);
  }

  private static getAvailableSubstrates(
    enzyme: Enzyme,
    inputMolecules: Molecule[],
    allEnzymes: Enzyme[]
  ): MoleculeType[] {
    const substrates: MoleculeType[] = [];
    
    // Add input molecules
    substrates.push(...inputMolecules.map(m => m.properties.type));
    
    // Add products from previous enzymes in the pathway
    const enzymeIndex = allEnzymes.indexOf(enzyme);
    for (let i = 0; i < enzymeIndex; i++) {
      const previousEnzyme = allEnzymes[i];
      const step = glycolysis_database.getStepByEnzyme(previousEnzyme.properties.type);
      if (step) {
        substrates.push(...step.products);
      }
    }
    
    return substrates;
  }

  public static getReactionProducts(enzymeType: EnzymeType): MoleculeType[] {
    const step = glycolysis_database.getStepByEnzyme(enzymeType);
    return step ? step.products : [];
  }

  public static getReactionSubstrates(enzymeType: EnzymeType): MoleculeType[] {
    const step = glycolysis_database.getStepByEnzyme(enzymeType);
    return step ? step.substrates : [];
  }

  public static isReactionPossible(
    enzymeType: EnzymeType,
    availableSubstrates: MoleculeType[]
  ): boolean {
    const step = glycolysis_database.getStepByEnzyme(enzymeType);
    if (!step) return false;

    return step.substrates.every(substrate => 
      availableSubstrates.includes(substrate)
    );
  }

  public static getGlycolysisProgress(enzymes: Enzyme[]): {
    completedSteps: number;
    nextStep: string;
    totalSteps: number;
  } {
    const placedEnzymes = enzymes.filter(e => e.isPlaced);
    const enzymeSequence = placedEnzymes.map(e => e.properties.type);
    const validation = glycolysis_database.validateStepSequence(enzymeSequence);
    
    const totalSteps = glycolysis_database.getGlycolysisSteps().length;
    const completedSteps = validation.isValid ? enzymeSequence.length : 0;
    
    let nextStep = 'Complete!';
    if (completedSteps < totalSteps) {
      const nextStepData = glycolysis_database.getStepByNumber(completedSteps + 1);
      nextStep = nextStepData ? nextStepData.description : 'Unknown';
    }
    
    return {
      completedSteps,
      nextStep,
      totalSteps,
    };
  }
}