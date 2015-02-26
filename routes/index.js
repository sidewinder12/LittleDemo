var express = require('express');
var router = express.Router();
var crypto = require('crypto'),
    User = require('./user.js'),
    Post = require('./post.js');




router.get('/', function (req, res) {
  Post.getAll(null, function (err, posts) {
    if (err) {
      posts = [];
    }
    res.render('index', {
      title: 'Main Page',
      user: req.session.user,
      posts: posts,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });
});

router.get('/reg', checkNotLogin);
router.get('/reg', function (req, res) {
  res.render('reg', {
    title: 'Register',
    user: req.session.user,
    success: req.flash('success').toString(),
    error: req.flash('error').toString()
  });
});

router.post('/reg', checkNotLogin);
router.post('/reg', function (req, res) {
  var name = req.body.name,
      password = req.body.password,
      password_re = req.body['password-repeat'];
  //validator
  if (password_re != password) {
    req.flash('error', 'Password is not the same!');
    return res.redirect('/reg');//back to reg
  }
  //create md5 of the password
  var md5 = crypto.createHash('md5'),
      password = md5.update(req.body.password).digest('hex');
  var newUser = new User({
    name: name,
    password: password,
    email: req.body.email
  });
  //check username is existed in database or not
  User.get(newUser.name, function (err, user) {
    if (err) {
      req.flash('error', err);
      return res.redirect('/');
    }
    if (user) {
      req.flash('error', 'Oh No Someone took the username!');
      return res.redirect('/reg');
    }
    //make a new user if no repetition
    newUser.save(function (err, user) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/reg');//fail, back to reg
      }
      req.session.user = user;//save user info to session
      req.flash('success', 'Registered!');
      res.redirect('/');//back to main page
    });
  });
});

router.get('/login', checkNotLogin);
router.get('/login', function (req, res) {

    res.render('login', {
      title: 'Login Page!',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()});

});

router.post('/login', checkNotLogin);
router.post('/login', function (req, res) {

  var md5 = crypto.createHash('md5'),
      password = md5.update(req.body.password).digest('hex');

  User.get(req.body.name, function (err, user) {
    if (!user) {
      req.flash('error', 'This username is unregistered!');
      return res.redirect('/login');
    }

    if (user.password != password) {
      req.flash('error', 'Password incorrect!');
      return res.redirect('/login');//
    }

    req.session.user = user;
    req.flash('success', 'Login success!');
    res.redirect('/');//jump back to main
  });
});

router.get('/post', checkLogin);
router.get('/post', function (req, res) {
  res.render('post', {
    title: 'Post',
    user: req.session.user,
    success: req.flash('success').toString(),
    error: req.flash('error').toString()
  });
});
router.post('/post', checkLogin);
router.post('/post', function (req, res) {
  var currentUser = req.session.user,
      post = new Post(currentUser.name, req.body.title, req.body.post);
  post.save(function (err) {
    if (err) {
      req.flash('error', err);
      return res.redirect('/');
    }
    req.flash('success', 'Successfully posted some data!');
    res.redirect('/');//back to main
  });
});


router.get('/logout', checkLogin);
router.get('/logout', function (req, res) {
  req.session.user = null;
  req.flash('success', 'Successfully logged out!');
  res.redirect('/');//Back to main
});


router.get('/u/:name', function (req, res) {

  User.get(req.params.name, function (err, user) {
    if (!user) {
      req.flash('error', 'User does not exist!');
      return res.redirect('/');
    }
    //query and return only articles from that username
    Post.getAll(user.name, function (err, posts) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/');
      }
      res.render('user', {
        title: user.name,
        posts: posts,
        user : req.session.user,
        success : req.flash('success').toString(),
        error : req.flash('error').toString()
      });
    });
  });
});

router.get('/u/:name/:day/:title', function (req, res) {
  Post.getOne(req.params.name, req.params.day, req.params.title, function (err, post) {
    if (err) {
      req.flash('error', err);
      return res.redirect('/');
    }
    res.render('article', {
      title: req.params.title,
      post: post,
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });
});

router.get('/edit/:name/:day/:title', checkLogin);
router.get('/edit/:name/:day/:title', function (req, res) {
  var currentUser = req.session.user;
  Post.edit(currentUser.name, req.params.day, req.params.title, function (err, post) {
    if (err) {
      req.flash('error', err);
      return res.redirect('back');
    }
    res.render('edit', {
      title: 'Edit',
      post: post,
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });
});

router.post('/edit/:name/:day/:title', checkLogin);
router.post('/edit/:name/:day/:title', function (req, res) {
  var currentUser = req.session.user;
  Post.update(currentUser.name, req.params.day, req.params.title, req.body.post, function (err) {
    var url = encodeURI('/u/' + req.params.name + '/' + req.params.day + '/' + req.params.title);
    if (err) {
      req.flash('error', err);
      return res.redirect(url);//Error, redirect
    }
    req.flash('success', 'Edit successfully saved!');
    res.redirect(url);//
  });
});

router.get('/remove/:name/:day/:title', checkLogin);
router.get('/remove/:name/:day/:title', function (req, res) {
  var currentUser = req.session.user;
  Post.remove(currentUser.name, req.params.day, req.params.title, function (err) {
    if (err) {
      req.flash('error', err);
      return res.redirect('back');
    }
    req.flash('success', 'Successfully deleted an article!');
    res.redirect('/');
  });
});

function checkLogin(req, res, next) {
  if (!req.session.user) {
    req.flash('error', 'Unlogged in!');
    res.redirect('/login');
  }
  next();
}

function checkNotLogin(req, res, next) {
  if (req.session.user) {
    req.flash('error', 'Logged in!');
    res.redirect('back');//back to previouys page
  }
  next();
}


module.exports = router;
