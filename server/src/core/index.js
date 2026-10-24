// Api directe du moteur de calculs

// Expositions pratiques des modules de calcul pur (fonctions pures)
module.exports = {
  residential: {
    designCurrent: require("./electric-rules/residential/design-current"),
    designCircuit: require("./electric-rules/residential/design-circuit"),
    cableSizing: require("./electric-rules/residential/cable-sizing"),
    overcurrentProtection: require("./electric-rules/residential/overcurrent-protection"),
    voltageDrop: require("./electric-rules/residential/voltage-drop"),
    protectionDdr: require("./electric-rules/residential/protection-ddr"),
    protectionEarth: require("./electric-rules/residential/protection-earth"),
    shortCircuit: require("./electric-rules/residential/short-circuit"),
    selectivity: require("./electric-rules/residential/selectivity"),
    networkStability: require("./electric-rules/residential/network-stability"),
    filiation: require("./electric-rules/residential/filiation"),
  },
};
