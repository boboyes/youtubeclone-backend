'use strict';

const Controller = require('egg').Controller;

class VideoController extends Controller {
  async createVideo() {
    const { ctx } = this;
    const { body } = ctx.request
    const { Video } = this.app.model
    ctx.validate({
        title: { type: "string" },
        description: { type: "string" },
        vodVideoId: { type: "string" }
        // cover: { type: "string" },
    })

    // 默认视频封面
    body.cover = 'http://outin-032ce1a0e9fe11eb821700163e1c955c.oss-cn-shanghai.aliyuncs.com/4705d31d247b4e9d870b39fdb9dcf05f/snapshots/60f6a730b603490bb36eda354232353c-00001.jpg?Expires=1627230355&OSSAccessKeyId=LTAI4FfD63zoqnm6ckiBFfXZ&Signature=ffQSxlQcMfOU94nQ9JvEdkyQyuA%3D'
    body.user = this.ctx.user._id
    const video = await new Video(body).save()
    this.ctx.status = 201
    this.ctx.body = {
        video
    }
  }
  async getVideo () {
    const { Video, Like: VideoLike, Subscription } = this.app.model
    const { videoId } = this.ctx.params
    let video = await Video.findById(videoId).populate('user', '_id username avatar subscribersCount')
    if (!video) {
      this.ctx.throw(404, 'Video Not Found')
    }
    video = video.toJSON()

    video.isLiked = false
    video.isDisliked = false
    video.user.isSubscribed = false

    if (this.ctx.user) {
      const userId = this.ctx.user._id
      if (await VideoLike.findOne({user: userId, video: videoId, like: 1})) {
        video.isLiked = true
      }
      if (await VideoLike.findOne({user: userId, video: videoId, like: -1})) {
        video.isDisliked = false
      }
      if (await Subscription.findOne({user: userId, channel: video.user._id})) {
        video.isDisliked = false
      }
    }
    this.ctx.body = {
      video
    }
  }
  async getVideos () {
    const { Video } = this.app.model
    let { pageNum = 1, pageSize = 10 } = this.ctx.query
    pageNum = Number.parseInt(pageNum)
    pageSize = Number.parseInt(pageSize)

    const getVideos = Video.find()
    .populate('user')
    .sort({createdAt: -1})
    .skip((pageNum - 1) * pageSize)
    .limit(pageSize)
    const getVideosCount = Video.countDocuments()

    const [ videos, videosCount ] = await Promise.all([
      getVideos,
      getVideosCount
    ])
    this.ctx.body = {
      videos,
      videosCount
    }
  }
  async getUserVideos () {
    const { Video } = this.app.model
    let { pageNum = 1, pageSize = 10 } = this.ctx.query
    const userId = this.ctx.params.userId
    pageNum = Number.parseInt(pageNum)
    pageSize = Number.parseInt(pageSize)

    const getVideos = Video.find({
      user: userId
    })
    .populate('user')
    .sort({createdAt: -1})
    .skip((pageNum - 1) * pageSize)
    .limit(pageSize)
    const getVideosCount = Video.countDocuments({
      user: userId
    })

    const [ videos, videosCount ] = await Promise.all([
      getVideos,
      getVideosCount
    ])
    this.ctx.body = {
      videos,
      videosCount
    }
  }
  async getUserFeedVideos () {
    const { Video, Subscription } = this.app.model
    let { pageNum = 1, pageSize = 10 } = this.ctx.query
    const userId = this.ctx.user._id
    pageNum = Number.parseInt(pageNum)
    pageSize = Number.parseInt(pageSize)
    const channels = await Subscription.find({user: userId}).populate('channel')
    const getVideos = Video.find({
      user: {
        $in: channels.map(item => item.channel._id) //关注用户的id列表
      }
    })
    .populate('user')
    .sort({createdAt: -1})
    .skip((pageNum - 1) * pageSize)
    .limit(pageSize)
    const getVideosCount = Video.countDocuments({
      user: {
        $in: channels.map(item => item.channel._id) //关注用户的id列表
      }
    })

    const [ videos, videosCount ] = await Promise.all([
      getVideos,
      getVideosCount
    ])
    this.ctx.body = {
      videos,
      videosCount
    }
  }

  async updateVideo () {
    const body = this.ctx.request.body
    const { Video } = this.app.model
    const { videoId } = this.ctx.params
    const userId = this.ctx.user._id

    //数据验证
    this.ctx.validate({
      title: { type: "string", required: false},
      description: { type: "string", required: false},
      vodVideoId: { type: "string", required: false},
      cover: { type: "string", required: false},
    })
    //查询视频
    const video = await Video.findById(videoId)
    if (!video) {
      this.ctx.throw(404, 'Video Not Found')
    }

    //视频作者是当前登录用户才能修改
    if (!video.user.equals(userId)) {
      this.ctx.throw(403, '无权限')
    }
    
    Object.assign(video, this.ctx.helper._.pick(body, ['title','description','vodVideoId','cover']))
    
    //保存修改
    await video.save()

    this.ctx.body = {
      video
    }
  }
  async deleteVideo () {
    const { Video } = this.app.model
    const { videoId } = this.ctx.params
    const video = await Video.findById(videoId)
    //视频不存在
    if (!video) {
      this.ctx.throw(404)
    }

    // 视频作者不是当前登录用户
    if (!video.user.equals(this.ctx.user._id)) {
      this.ctx.throw(403)
    }

    await video.remove()

    this.ctx.status = 204
  }

  async createComment () {
    const { body } = this.ctx.request
    const { Video, Comment: VideoComment } = this.app.model
    const { videoId } = this.ctx.params
    //数据验证
    this.ctx.validate({
      content: "string"
    })
    //获取评论所属视频
    const video = await Video.findById(videoId)
    if (!video) {
      this.ctx.throw(404)
    }

    //创建评论
    const comment = await new VideoComment({
      content: body.content,
      user: this.ctx.user._id,
      video: videoId
    }).save()

    //更新视频的评论数量
    video.commentsCount = await VideoComment.countDocuments({
      video: videoId
    })
    await video.save()

    //映射评论用户和视频字段数据
    await comment.populate('user').populate('video').execPopulate()

    //响应
    this.ctx.body = {
      comment
    }
  }

  async getVideoComments () {
    const { Comment: VideoComment } = this.app.model
    let { pageNum = 1, pageSize = 10 } = this.ctx.query
    const videoId = this.ctx.params.videoId
    pageNum = Number.parseInt(pageNum)
    pageSize = Number.parseInt(pageSize)

    const getComments = VideoComment.find({
      video: videoId
    })
    .skip((pageNum - 1) * pageSize)
    .limit(pageSize)
    .populate('user')
    .populate('video')
    const getCommentsCount = VideoComment.countDocuments({
      video: videoId
    })

    const [ comments, commentsCount ] = await Promise.all([
      getComments,
      getCommentsCount
    ])
    this.ctx.body = {
      comments,
      commentsCount
    }
  }

  async deleteVideoComment () {
    const { Video, Comment: VideoComment } = this.app.model
    const { videoId, commentId } = this.ctx.params

    //检查视频是否存在
    const video = await Video.findById(videoId)
    if (!video) this.ctx.throw(404, 'Video Not Found')

    //检查评论是否存在
    const comment = await VideoComment.findById(commentId)
    if (!comment) this.ctx.throw(404, 'Comment Not Found')

    //检查评论作者是否是当前用户
    if (!comment.user.equals(this.ctx.user._id)) this.ctx.throw(403)

    //删除视频评论
    await comment.remove()

    //更新视频评论数量
    video.commentsCount = await VideoComment.countDocuments({
      video: videoId
    })
    await video.save()

    //响应
    this.ctx.status = 204
  }

  async likeVideo () {
    const { Video, Like: VideoLike } = this.app.model
    const { videoId } = this.ctx.params
    const userId = this.ctx.user._id
    const video = await Video.findById(videoId)

    if (!video) thic.ctx.throw(404, 'Video Not Found')

    const doc = await VideoLike.findOne({user: userId, video: videoId})

    let isLiked = true

    if (doc && doc.like === 1) {
      await doc.remove()
      isLiked = false
    } else if (doc && doc.like === -1) {
      doc.like = 1
      await doc.save()
    } else {
      await new VideoLike({
        user: userId, 
        video: videoId, 
        like: 1
      }).save()
    }

    //更新喜欢视频的数量
    video.likesCount = await VideoLike.countDocuments({
      video: videoId,
      like: 1
    })

    //更新不喜欢视频的数量
    video.dislikesCount = await VideoLike.countDocuments({
      video: videoId,
      like: -1
    })
    //保存到数据库
    await video.save()

    this.ctx.body = {
      video: {
        ...video.toJSON(),
        isLiked
      }
    }
  }
  async dislikeVideo () {
    const { Video, Like: VideoLike } = this.app.model
    const { videoId } = this.ctx.params
    const userId = this.ctx.user._id
    const video = await Video.findById(videoId)

    if (!video) thic.ctx.throw(404, `No video found for ID - ${videoId}`)

    const doc = await VideoLike.findOne({user: userId, video: videoId})

    let isDisliked = true

    if (doc && doc.like === -1) {
      await doc.remove()
      isDisliked = false
    } else if (doc && doc.like === 1) {
      doc.like = -1
      await doc.save()
    } else {
      await new VideoLike({
        user: userId, 
        video: videoId, 
        like: -1
      }).save()
    }

    //更新喜欢视频的数量
    video.likesCount = await VideoLike.countDocuments({
      video: videoId,
      like: 1
    })

    //更新不喜欢视频的数量
    video.dislikesCount = await VideoLike.countDocuments({
      video: videoId,
      like: -1
    })
    //保存到数据库
    await video.save()

    this.ctx.body = {
      video: {
        ...video.toJSON(),
        isDisliked
      }
    }
  }

  async getUserLikedVideos () {
    const { Video, Like: VideoLike } = this.app.model
    let { pageNum = 1, pageSize = 10 } = this.ctx.query
    pageNum = Number.parseInt(pageNum)
    pageSize = Number.parseInt(pageSize)
    const filterDoc = {
      user: this.ctx.user._id,
      like: 1
    }

    const likes = await VideoLike
      .find(filterDoc)
      .sort({
        createdAt: -1
      })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)

    const getVideos = Video.find({
      _id: {
        $in: likes.map(item => item.video)
      }
    })
    .populate('user')
    const getVideosCount = VideoLike.countDocuments(filterDoc)

    const [ videos, videosCount ] = await Promise.all([
      getVideos,
      getVideosCount
    ])
    this.ctx.body = {
      videos,
      videosCount
    }
  }
}

module.exports = VideoController;