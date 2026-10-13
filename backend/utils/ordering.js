export const nextPosition = async (model, where, transaction) => {
  const maximum = await model.max("position", { where, transaction });
  return maximum === null || Number.isNaN(Number(maximum)) ? 0 : Number(maximum) + 1;
};
