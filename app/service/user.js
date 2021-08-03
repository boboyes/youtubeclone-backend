'use strict';
const Service = require('egg').Service;
const jwt = require('jsonwebtoken');

class UserService extends Service {
  get User() {
    return this.app.model.User;
  }

  findByUsername(username) {
    return this.User.findOne({ username });
  }

  findByEmail(email) {
    return this.User.findOne({ email }).select('+password');
  }

  async createUser(data) {
    data.password = this.ctx.helper.md5(data.password);
    const user = new this.User(data);
    await user.save();
    return user;
  }

  async updateUser(data) {
    return this.User.findByIdAndUpdate(this.ctx.user._id, data, { new: true }); // 返回更新后得数据

  }
  createToken(data) {
    return jwt.sign(data, this.app.config.jwt.secret, {
      expiresIn: this.app.config.jwt.expiresIn,
    });
  }

  verifyToken(token) {
    return jwt.verify(token, this.app.config.jwt.secret);
  }

  async subscribe(userId, channelId) {
    const { Subscription, User } = this.app.model;
    // 1. 检查是否已经订阅
    const record = await Subscription.findOne({
      user: userId,
      channel: channelId,
    });
    const user = await User.findById(channelId);
    // 2. 没有订阅， 添加订阅
    if (!record) {
      await new Subscription({
        user: userId,
        channel: channelId,
      }).save();
      // 更新用户的订阅数量
      user.subscribersCount++;
      await user.save();
    }
    // 3. 返回用户信息
    return user;
  }

  async unsubscribe(userId, channelId) {
    const { Subscription, User } = this.app.model;
    // 1. 检查是否已经订阅
    const record = await Subscription.findOne({
      user: userId,
      channel: channelId,
    });
    const user = await User.findById(channelId);
    // 2. 没有订阅， 添加订阅
    if (record) {
      await record.remove();
      // 更新用户的订阅数量
      user.subscribersCount--;
      await user.save();
    }
    // 3. 返回用户信息
    return user;
  }
}

module.exports = UserService;
