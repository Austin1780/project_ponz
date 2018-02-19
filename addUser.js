const User = require("./models/user");

// ------------------
// addUser Middleware
//-------------------

let addUser = async (fname, lname, email, password, parentId, next) => {
  try {
    if (parentId === "0") {
      const user = new User({ fname, lname, email, password });
      await user.save();
    } else {
      const user = new User({ fname, lname, email, password, parentId });
      await user.save();
      await user.addPoints();
      await User.findByIdAndUpdate(parentId, {
        $push: { childIds: user._id }
      });
    }
    next();
  } catch (err) {
    console.log(err);
  }
};

module.exports = addUser;
