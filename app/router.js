'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;
  const auth = app.middleware.auth()
  router.prefix('/api/v1')

  router.post('/users', controller.user.create)
  router.post('/users/login', controller.user.login)
  router.get('/user', auth, controller.user.getCurrentUser)
  router.patch('/user', auth, controller.user.update)
  router.get('/users/:userId', app.middleware.auth({ required: false }), controller.user.getUser)

  // 用户订阅
  router.post('/users/:userId/subscribe', auth, controller.user.subscribe)
  router.delete('/users/:userId/subscribe', auth, controller.user.unsubscribe)
  router.get('/users/:userId/subscriptions', controller.user.getSubscriptions)

  // 阿里云 VOD
  router.get('/vod/CreateUploadVideo', auth, controller.vod.createUploadVideo)
  router.get('/vod/RefreshUploadVideo', auth, controller.vod.refreshUploadVideo)
  router.get('/vod/GetVideoPlayAuth', controller.vod.getVideoPlayAuth) // 获取视频播放凭证

  // 视频
  router.post('/videos', auth, controller.video.createVideo)
  router.get('/videos/:videoId', app.middleware.auth({ required: false }), controller.video.getVideo)
  router.get('/videos', controller.video.getVideos)
  router.get('/users/:userId/videos', controller.video.getUserVideos)
  router.get('/users/videos/feed', auth, controller.video.getUserFeedVideos)
  router.patch('/videos/:videoId', auth, controller.video.updateVideo)
  router.delete('/videos/:videoId', auth, controller.video.deleteVideo)
  router.post('/videos/:videoId/comments', auth, controller.video.createComment)
  router.get('/videos/:videoId/comments', controller.video.getVideoComments)
  router.delete('/videos/:videoId/comments/:commentId', auth, controller.video.deleteVideoComment)
  router.post('/videos/:videoId/like', auth, controller.video.likeVideo)
  router.post('/videos/:videoId/dislike', auth, controller.video.dislikeVideo)
  router.get('/user/videos/liked', auth, controller.video.getUserLikedVideos)
};
