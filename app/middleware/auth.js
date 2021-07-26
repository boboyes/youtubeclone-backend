// app/middleware/auth.js
'use strict';
module.exports = (options = { required: true }) => {
  return async (ctx, next) => {
    // 1. 获取请求头的token数据
    let token = ctx.headers.authorization; // Bearer token
    token = token ? token.split('Bearer ')[1] : null;
    // 2. 验证token, 无效返回401
    if (token) {
      try {
        // 3. token 有效， 根据 userId获取用户数据挂载到ctx对象中给后续中间件使用
        const data = ctx.service.user.verifyToken(token);
        ctx.user = await ctx.model.User.findById(data.userId);
      } catch (err) {
        ctx.throw(401);
      }
    } else if (options.required) {
      ctx.throw(401);
    }

    // 4. next执行后续中间件
    await next();
  };
};
