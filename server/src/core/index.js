// Api directe du moteur de calculs

// Expositions pratiques des modules de calcul pur (fonctions pures)
module.exports = {
  residential: {
    designCurrent: require("./electric-rules/residential/design-current.Js"),
    cableSizing: require("./electric-rules/residential/cable-sizing"),
    overcurrentProtection: require("./electric-rules/residential/overcurrent-protection"),
    voltageDrop: require("./electric-rules/residential/voltage-drop"),
    protectionDdr: require("./electric-rules/residential/protection-ddr"),
  },
};
