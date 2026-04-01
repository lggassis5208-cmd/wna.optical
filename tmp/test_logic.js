const getEffectiveAddress = (dateStr) => {
  // Garantir que a string YYYY-MM-DD não sofra shift de timezone
  const dateStrFixed = (dateStr && dateStr.length === 10) ? dateStr + "T12:00:00" : dateStr;
  const date = dateStrFixed ? new Date(dateStrFixed) : new Date();
  
  console.log(`Input: ${dateStr} -> Fixed: ${dateStrFixed} -> Date: ${date.toISOString()} -> Day: ${date.getDay()}`);
  
  if (date.getDay() === 5) {
    return "Av das Esmeraldas Qd 42 Lt 14 - Recanto das Minas Gerais";
  }
  return "Av Anápolis Qd 03 Lt 01 - Vila Concórdia";
};

console.log("Teste de Endereços (DEBUG):");
getEffectiveAddress("2026-03-30"); // Segunda
getEffectiveAddress("2026-04-03"); // Sexta
getEffectiveAddress(); // Hoje (Quarta)
