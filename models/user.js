const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const uniqueValidator = require("mongoose-unique-validator");
const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    fname: { type: String, required: true },
    lname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    parentId: String,
    childIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    ponzPoints: Number,
    depth: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    levelCounts: [{ type: Number, default: 0 }]
  },
  {
    timestamps: true
  }
);

UserSchema.methods.addPoints = async function() {
  let distance = 0;
  let user = this;
  while (user.parentId) {
    let parent = await User.findById(user.parentId);
    parent.points += determinePoints(distance);
    parent.save();
    distance++;
    user = parent;
  }
};

let determinePoints = distance => {
  const points = [40, 20, 10, 5, 2];
  if (distance < 5) return points[distance];
  return 1;
};

UserSchema.methods.populateChildren = async function(depth = -1) {
  let user = await User.findById(this._id).populate("childIds");
  user.depth = depth;
  user.childIds = await Promise.all(
    user.childIds.map(child => {
      return child.populateChildren(depth + 1);
    })
  );
  return user;
};

UserSchema.virtual("displayName").get(function() {
  return this.fname + " " + this.lname;
});

UserSchema.plugin(uniqueValidator);

UserSchema.methods.validPassword = function(password) {
  return bcrypt.compareSync(password, this.passwordHash);
};

UserSchema.virtual("password")
  .get(function() {
    return this._password;
  })
  .set(function(value) {
    this._password = value;
    this.passwordHash = bcrypt.hashSync(value, 8);
  });

const User = mongoose.model("User", UserSchema);

module.exports = User;
