const PointsHelper = {};

PointsHelper.pointLevel = depth => {
  let points = [40, 20, 10, 5, 2];
  let amount = depth < 5 ? points[depth] : 1;
  return amount;
};

module.exports = PointsHelper;
