const express = require('express')
const path = require('path')
const app = express();
const mongoose = require('mongoose')
const morgan = require('morgan')
const ejsMate = require('ejs-mate')
const catchAsync = require('./utils/catchAsync')
const ExpressError = require('./utils/ExpressError')
const {campgroundSchema, reviewSchema} = require('./schemas.js')

const methodOverride = require('method-override')

const Campground = require('./models/campground')
const Review = require('./models/review')

mongoose.connect('mongodb://localhost:27017/yelp-camp', {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true})

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", ()=>{
  console.log("Database connected")
})

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.engine('ejs', ejsMate);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const validateCampground = (req, res, next) => {
  const {error} = campgroundSchema.validate(req.body)

  if(error){
    const msg = error.details.map(el => el.message).join(',')
    throw new ExpressError(msg, 400);
  } else {
    next();
  }
}

const validateReview = (req, res, next) => {
  const {error} = reviewSchema.validate(req.body)

  if(error){
    const msg = error.details.map(el => el.message).join(',')
    throw new ExpressError(msg, 400);
  } else {
    next();
  }
}


app.get('/', (req, res) => {
  res.render('home');
})

app.get('/campgrounds/new', (req, res) => {
  res.render('campgrounds/new')
})

app.get('/campgrounds', catchAsync(async (req, res, next) => {
  const campgrounds = await Campground.find({});
  if (!campgrounds){
     throw new ExpressError('Product Not Found', 404)
  }
  res.render('campgrounds/index', {campgrounds})
}))

app.post('/campgrounds', validateCampground, catchAsync(async (req, res, next) =>{
  // if (!req.body.campground) throw new ExpressError('Invalid Campground Data', 400)

  const campground = new Campground(req.body.campground);
  await campground.save();
  res.redirect(`/campgrounds/${campground._id}`);
}))

app.get('/campgrounds/:id', catchAsync(async (req, res, next) => {
  const campground = await Campground.findById(req.params.id).populate('reviews');
  console.log(campground)
  res.render('campgrounds/show', {campground})
}))

app.get('/campgrounds/:id/edit', catchAsync(async (req, res, next) => {
  const campground = await Campground.findById(req.params.id);
  res.render('campgrounds/edit', {campground})
}))

app.patch('/campgrounds/:id', validateCampground, catchAsync(async (req, res, next) => {
  const {id} = req.params
  const campground = await Campground.findByIdAndUpdate(id, {...req.body.campground});
  res.redirect(`/campgrounds/${campground._id}`)
}))

app.delete('/campgrounds/:id', catchAsync(async (req, res, next) => {
  const campground = await Campground.findByIdAndDelete(req.params.id);
  await console.log("pre redirect")
  res.redirect(`/campgrounds`)
}))

app.post('/campgrounds/:id/reviews', validateReview, catchAsync(async (req, res, next) =>{
  const {id} = req.params
  const campground = await Campground.findById(req.params.id);
  const review = new Review(req.body.review);
  campground.reviews.push(review);
  await review.save();
  await campground.save();
  res.redirect(`/campgrounds/${id}`);
}))

app.delete('/campgrounds/:id/reviews/:reviewId', catchAsync(async (req, res, next) => {
  const {id, reviewId} = req.params
  await Review.findByIdAndDelete(reviewId);
  await Campground.findByIdAndUpdate(id, {$pull: {reviews: reviewId}});
  res.redirect(`/campgrounds/${id}`);
}))

app.all('*', (req, res, next) =>{
  next(new ExpressError('Page Not Found', 404 ))
})

app.use((err, req, res, next) => {
  console.log(err.name);
  next(err);
})

app.use((err, req, res, next) => {
  console.log("***************************************************")
  console.log("*******************ERROR***************************")
  console.log("***************************************************")
  const {status = 500, message = "Something went wrong"} = err
  console.log(err)
  console.log(status)
  console.log(message)
  if (!err.message) err.message = "Oh no, something went wrong."
  res.status(status).render('error', {err});
})

app.listen(3000, () => {
  console.log("SERVING ON PORT 3000")
})
