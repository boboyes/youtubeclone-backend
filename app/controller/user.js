'use strict';

const Controller = require('egg').Controller;

class UserController extends Controller {
  async create() {
    const { ctx, service } = this;
    const { request: { body } } = ctx
    // 1. 数据校验
    ctx.validate({ 
        username: { type: 'string'},
        email: { type: 'email'},
        password: { type: 'string'}
    })
    if (await service.user.findByUsername(body.username)) {
        ctx.throw(422, 'Validation Failed', {
            errors: [
              {
                code: 'invalid',
                field: 'username',
                message: 'has already exists'
              }
            ]
        })
    }
    if (await service.user.findByEmail(body.email)) {
        ctx.throw(422, 'Validation Failed', {
            errors: [
              {
                code: 'invalid',
                field: 'email',
                message: 'has already exists'
              }
            ]
        })
    }

    //2. 保存用户
    const user = await service.user.createUser(body)

    //3. 生成token
    const token = service.user.createToken({
        userId: user._id
    })

    //4. 发送响应
    ctx.body = {
        user: {
            email: user.email,
            token,
            username: user.username,
            channelDescription: user.channelDescription,
            avatar: user.avatar
        }
    }
  }
  async login() {
    const { ctx, service } = this;
    const { request: { body } } = ctx
      //1. 基本数据校验
    ctx.validate({
        email: { type: 'email'},
        password: { type: 'string'}
    })
      //2. 校验邮箱
      const user = await service.user.findByEmail(body.email)
    if (!user) {
        ctx.throw(422, 'Validation Failed', {
            errors: [
              {
                code: 'invalid',
                field: 'email',
                message: 'not exists'
              }
            ]
          })
    }
      //3. 校验密码
    if (this.ctx.helper.md5(body.password) !== user.password) {
        ctx.throw(422, 'Validation Failed', {
            errors: [
              {
                code: 'invalid',
                field: 'password',
                message: 'incorrect'
              }
            ]
          })
    }
      //. token
    const token = service.user.createToken({
        userId: user._id
    })
      //4. 发送响应
    ctx.body = {
        user: {
            email: user.email,
            token,
            username: user.username,
            channelDescription: user.channelDescription,
            avatar: user.avatar
        }
    }
  }
  async getCurrentUser () { 
      //1. 验证token
      //2. 获取用户
      //3. 发送响应
    const user = this.ctx.user
    this.ctx.body = {
        user: {
            email: user.email,
            token: this.ctx.header['authorization'],
            username: user.username,
            channelDescription: user.channelDescription,
            avatar: user.avatar
        }
    }
  }
  async update () {
    const { ctx, service } = this;
    const { request: { body } } = ctx
    const userService = service.user
    //1. 基本数据验证
    ctx.validate({ 
        username: { type: 'string', required: false },
        email: { type: 'email', required: false },
        password: { type: 'string', required: false},
        channelDescription: { type: 'string', required: false},
        avatar: { type: 'string', required: false}
    })
    //2. 校验邮箱是否已存在
    if (body.email) {
        //如果当前邮箱和传入邮箱不一致且数据库中已经存在传入邮箱
        if (body.email !== this.ctx.user.email && await userService.findByEmail(body.email)) {
            ctx.throw(422, '邮箱已存在')
        }
    }
    //3. 校验用户是否已存在
    if (body.username) {
        //如果当前username和传入username不一致且数据库中已经存在传入username
        if (body.username !== this.ctx.user.username && await userService.findByUsername(body.username)) {
            ctx.throw(422, '用户已存在')
        }
    }
    if (body.password) {//加密
        body.password = this.ctx.helper.md5(body.password)
    }
    //4. 更新用户信息
    const user = await userService.updateUser(body)
    //5. 返回更新用户信息
    ctx.body = {
        user: {
            email: user.email,
            password: user.password,
            username: user.username,
            channelDescription: user.channelDescription,
            avatar: user.avatar
        }
    }
  }

  async subscribe () {
    const userId = this.ctx.user._id
    const channelId = this.ctx.params.userId
    // 1. 用户不能订阅自己
    if (userId.equals(channelId)) {
        this.ctx.throw(422, '用户不能订阅自己')
    }
    // 2. 添加订阅
    const user = await this.service.user.subscribe(userId, channelId)
    // 3. 发送响应
    this.ctx.body = {
        user: {
            ...this.ctx.helper._.pick(user, [
                'username',
                'email',
                'avatar',
                'cover',
                'channelDescription',
                'subscribersCount'
            ]),
            isSubscribed: true
        }
    }
  }

  async unsubscribe () {
    const userId = this.ctx.user._id
    const channelId = this.ctx.params.userId
    // 1. 用户不能订阅自己
    if (userId.equals(channelId)) {
        this.ctx.throw(422, '用户不能订阅自己')
    }
    // 2. 取消订阅
    const user = await this.service.user.unsubscribe(userId, channelId)
    // 3. 发送响应
    this.ctx.body = {
        user: {
            ...this.ctx.helper._.pick(user, [
                'username',
                'email',
                'avatar',
                'cover',
                'channelDescription',
                'subscribersCount'
            ]),
            isSubscribed: false
        }
    }
  }
  async getUser () {
      //1. 获取订阅状态
    let isSubscribed = false
    if (this.ctx.user) {
        const record = await this.app.model.Subscription.findOne({
            user: this.ctx.user._id,
            channel: this.ctx.params.userId
        })
        if (record) isSubscribed = true
    }
      //2. 获取用户信息
    const user = await this.app.model.User.findById(this.ctx.params.userId)
      //3. 发送响应
    this.ctx.body = {
        user: {
            ...this.ctx.helper._.pick(user, [
                'username',
                'email',
                'avatar',
                'cover',
                'channelDescription',
                'subscribersCount'
            ]),
            isSubscribed
        }
    }
  }

  async getSubscriptions () {
      const Subscription = this.app.model.Subscription
      let subscriptions = await Subscription.find({
          user: this.ctx.params.userId
      }).populate('channel')

      subscriptions = subscriptions.map(item => {
          return this.ctx.helper._.pick(item.channel, [
            "_id",
            "username",
            "avatar"
          ])
      })
      this.ctx.body = {
          subscriptions
      }
  }
}

module.exports = UserController;