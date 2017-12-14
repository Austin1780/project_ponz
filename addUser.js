const User = require("./models/user");

let addUser = (fname, lname, email, password, parentId, next) => {
  if (parentId === "0") {
    const user = new User({ fname, lname, email, password });
    await user.save(err => {});
  } else {
    const user = new User({ fname, lname, email, password, parentId });
    await user.save(async err => {
      await user.addPoints();
      await User.findByIdAndUpdate(parentId, {
        $push: { childIds: user._id }
        //$inc: { depth: 1 }
      });
    });
  }
  next();
};

module.exports = addUser;
