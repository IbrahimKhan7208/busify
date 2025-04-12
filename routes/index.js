var express = require('express');
var router = express.Router();
const mongoose = require('mongoose'); 
const puppeteer = require('puppeteer');
const userModel = require('./users');
const busModel = require('./bus');
const ticketModel = require('./ticket')
const Feedback = require('./feedback')
const feedbackModel = require('./feedback')
const sendEmail = require('./sendEmail')
const Stripe = require('stripe');
const localStrategy = require('passport-local');

const passport = require('passport');
passport.use(new localStrategy(userModel.authenticate()));

router.get('/', function(req, res) {
  res.render('index');
});

router.get('/home',isLoggedIn, function(req , res ){
  res.render("home");
});

router.get('/admin-dashboard', isAdmin, async function (req, res) {
  try {
    const user = await userModel.findOne({ username: req.session.passport.user });

    const adminId = req.user._id;

    const buses = await busModel.find({ addedBy: adminId });
    buses.forEach(bus => {
      bus.formattedDepartureTime = new Date(bus.departureTime).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      bus.formattedArrivalTime = new Date(bus.arrivalTime).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    });

    const totalBookings = await ticketModel.countDocuments();

    const revenueAggregation = await ticketModel.aggregate([
      {
        $group: {
          _id: null,
          revenue: { $sum: "$fare" }
        }
      }
    ]);

    const totalRevenue = revenueAggregation.length > 0 ? revenueAggregation[0].revenue : 0;

    const revenueByBus = await ticketModel.aggregate([
      {
        $group: {
          _id: "$busId",
          totalRevenue: { $sum: "$fare" },
          bookingCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "buses",
          localField: "_id",
          foreignField: "_id",
          as: "busDetails"
        }
      },
      { $unwind: "$busDetails" },
      {
        $match: {
          "busDetails.addedBy": adminId
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // 🆕 Fetch feedbacks for buses added by this admin
    const feedbacks = await feedbackModel.find()
      .populate({
        path: 'busId',
        match: { addedBy: adminId }, // Only feedback for admin's buses
        select: 'name'               // Only get bus name
      })
      .lean(); // make it faster to access

    // 🆙 Filter out feedbacks where busId is null (means not this admin's bus)
    const filteredFeedbacks = feedbacks.filter(feedback => feedback.busId !== null);

    res.render('admin-dashboard', {
      user,
      buses,
      totalBookings,
      totalRevenue,
      revenueByBus,
      feedbacks: filteredFeedbacks // 🆕 passing feedbacks to EJS
    });

  } catch (error) {
    console.error("Error loading admin dashboard:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post('/addbus', async function(req , res){
  const { name, busnumber, type, capacity, source, destination, departureTime, arrivalTime, fare} = req.body; 
  const addedBy = req.user._id;
  const newBus = new busModel({
    name, busnumber, type, capacity, source, destination, departureTime, arrivalTime, fare, addedBy
  });

  try {
    await newBus.save();
    res.redirect('/admin-dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error adding bus');
  }
});

router.get('/signup', function(req, res) {
  res.render('signup' , {error : req.flash('error')});
});

router.post('/signup', async function (req, res) {
  const { name, username, role, password } = req.body;

  try {
    const existingUser = await userModel.findOne({ username });
    if (existingUser) {
      return res.render('signup', { error: "Username already exists. Please choose a different one." });
    }

    const userdata = new userModel({ name, username, role });
    await userModel.register(userdata, password);

    passport.authenticate("local")(req, res, function () {
      if (req.user.role === 'admin') {
        req.flash('success_msg' , 'Successfully Signed Up!')
        res.redirect('/admin-dashboard');
      } else {
        req.flash('success_msg', 'Successfully Signed Up!');
        res.redirect('/home');
      }
    });

  } catch (err) {
    console.error("Signup error:", err);
    res.render('signup', { error: "An error occurred. Please try again." });
  }
});

router.get('/login', function(req, res) {
  res.render('login' , {error : req.flash('error')});
});

router.post('/login', passport.authenticate('local', {
  failureRedirect: '/login', 
  failureFlash: true
 }),
  function (req, res) {
    if (req.user.role === 'admin') {
      req.flash('success_msg', 'Successfully Signed Up!');
      res.redirect('/admin-dashboard');
    } else {
      req.flash('success_msg', 'Successfully Signed Up!');
      res.redirect('/home');
    }
  }
);

router.get('/logout' , function(req , res , next){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  })
});

router.get('/account' , isLoggedIn , async function(req , res) {
  const user = await userModel.findOne({
    username: req.session.passport.user
  })
  res.render('account' , {user});
});

router.get('/booking-history', async (req, res) => {
  try {
    const username = req.user.username;
    const currentDateTime = new Date();

    // Fetch all past tickets for the logged-in user
    const tickets = await ticketModel
      .find({ username, departureTime: { $lt: currentDateTime } })
      .sort({ departureTime: 1 })
      .populate('busId'); // Populate bus details

    // Prepare ticket details with bus existence check
    const ticketDetails = tickets.map(ticket => ({
      ticket,
      busExists: !!ticket.busId, // Check if busId exists
      journeyDate: new Date(ticket.departureTime).toDateString()
    }));

    if (!ticketDetails.length) {
      return res.send('No past tickets found.');
    }

    res.render('booking-history', { ticketDetails });
  } catch (error) {
    console.error('Error loading booking history:', error);
    res.status(500).send('Something went wrong.');
  }
});

router.get('/show-my-tickets', async (req, res) => {
  try {
    const username = req.user.username;
    const currentDateTime = new Date();

    const tickets = await ticketModel
      .find({
        username,
        departureTime: { $gte: currentDateTime }
      })
      .sort({ departureTime: 1 })
      .populate('busId');

    const ticketDetails = tickets.map(ticket => ({
      ticket,
      journeyDate: new Date(ticket.departureTime).toDateString()
    }));
    res.render('show-my-tickets', { ticketDetails });

  } catch (error) {
    console.error('Error loading user tickets:', error);
    res.status(500).send('Something went wrong.');
  }
});

router.get('/show-ticket', async (req, res) => {
  try {
    const ticketId = req.query.id; // Ticket ID from query (after booking)

    if (!ticketId) {
      return res.status(400).send('Ticket ID is required.');
    }

    // Find ticket by ID (after booking)
    const ticket = await ticketModel.findById(ticketId).populate('busId');

    if (!ticket) {
      return res.render('no-ticket', { message: 'Ticket not found.' });
    }

    // Prepare journey date from departure time
    const journeyDate = new Date(ticket.departureTime).toDateString();

    // Render the ticket details page
    res.render('show-ticket', { 
      ticket, 
      journeyDate 
    });
  } catch (error) {
    console.error('Error loading ticket details:', error);
    res.status(500).send('Something went wrong.');
  }
});

router.get("/booking-page" , async function(req , res){
  const { from, to, date } = req.query; 
  try{
  const show = await busModel.find({
    source: from,
    destination: to,
    departureTime: {
      $gte: new Date(date + "T00:00:00"),
      $lt: new Date(date + "T23:59:59"),
    }
  });
  show.forEach(bus => {
    bus.formattedDepartureTime = new Date(bus.departureTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    bus.formattedArrivalTime = new Date(bus.arrivalTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  });
  res.render('available-buses' , {show});
  }
  catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving buses');
  }
});

router.get('/mum-dlh' , async function(req , res){
  const currentDate = new Date();
    const show = await busModel.find({
      source: "Mumbai",
      destination: "Delhi",
      departureTime: { $gte: currentDate }
    });
  show.forEach(bus => {
    bus.formattedDepartureTime = new Date(bus.departureTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    bus.formattedArrivalTime = new Date(bus.arrivalTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  });
  res.render('available-buses' , {show});
});

router.get('/mum-hyd' , async function(req , res){
  const currentDate = new Date();
    const show = await busModel.find({
      source: "Mumbai",
      destination: "Hyderabad",
      departureTime: { $gte: currentDate } 
    });
  show.forEach(bus => {
    bus.formattedDepartureTime = new Date(bus.departureTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    bus.formattedArrivalTime = new Date(bus.arrivalTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  });
  res.render('available-buses' , {show});

});

router.get('/dlh-hyd' , async function(req , res){
  const currentDate = new Date();
    const show = await busModel.find({
      source: "Delhi",
      destination: "Hyderabad",
      departureTime: { $gte: currentDate } 
    });
  show.forEach(bus => {
    bus.formattedDepartureTime = new Date(bus.departureTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    bus.formattedArrivalTime = new Date(bus.arrivalTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  });
  res.render('available-buses' , {show});
});

router.get('/book-ticket' , async function(req , res){
  const busId = req.query.busId;
  const bus = await busModel.findById(busId);
  if (!bus) {
    return res.status(404).send('Bus not found');
  }
  bus.formattedDepartureTime = new Date(bus.departureTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  bus.formattedArrivalTime = new Date(bus.arrivalTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  res.render("book-ticket" , {bus , user: req.user});
});

router.get('/confirm-booking', async (req, res) => {
  try {
    console.log("✅ Received request to /confirm-booking");

    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
    if (!session || session.payment_status !== 'paid') {
      console.error("❌ Payment verification failed.");
      return res.status(400).send('Payment verification failed.');
    }

    if (!req.session.bookingData) {
      console.error("❌ Booking session expired.");
      return res.status(400).send("Booking session expired. Please try again.");
    }

    const { busId, username, seats, fare, passengers } = req.session.bookingData; // ✅ No JSON
    console.log("🔹 Retrieved Booking Data:", { busId, username, seats, fare, passengers });

    const bus = await busModel.findById(busId);
    if (!bus) return res.status(404).send('Bus not found.');
    if (seats > bus.capacity) return res.status(400).send(`Cannot book more than ${bus.capacity} seats.`);

    const totalFare = seats * bus.fare;

    const ticket = await ticketModel.create({
      busId,
      username,
      passengers,
      seats,
      fare: totalFare,
      departureTime: bus.departureTime,
      arrivalTime: bus.arrivalTime,
    });

    bus.capacity -= seats;
    await bus.save();
    console.log("✅ Ticket Confirmed:", ticket._id);

    // ✅ Ensure passengers exist before sending emails
    if (Array.isArray(passengers) && passengers.length > 0) {
      passengers.forEach(async (passenger) => {
        await sendEmail(
          passenger.email,
          "Booking Confirmation",
          `Dear ${passenger.name}, your ticket for ${bus.name} on ${bus.departureTime} is confirmed.`
        );
      });
    } else {
      console.error("❌ No passengers found, skipping email.");
    }

    req.session.bookingData = null;
    res.redirect(`/show-ticket?id=${ticket._id}`);

  } catch (error) {
    console.error('❌ Error confirming booking:', error);
    res.status(500).send('Something went wrong.');
  }
});

router.get('/delete-bus/:busnumber' , async function(req , res){
  const busnumber = req.params.busnumber;
  await busModel.deleteOne({ busnumber: busnumber });
  res.redirect('/admin-dashboard'); 
});

router.post('/cancel-ticket', async (req, res) => {
  try {
    const ticketId = req.body.ticketId; // Ticket ID from the form

    // Mark the ticket as cancelled
    await ticketModel.findByIdAndUpdate(ticketId, { status: 'cancelled' });

    res.redirect('/show-my-tickets'); // Redirect back to the tickets page
  } catch (error) {
    console.error('Error cancelling ticket:', error);
    res.status(500).send('Something went wrong.');
  }
});

router.post('/submit-feedback', async (req, res) => {
  try {
    const { busId, rating, comments } = req.body;
    console.log('Received busId:', busId); 

    if (!mongoose.Types.ObjectId.isValid(busId)) {
      return res.status(400).send('Invalid bus ID.');
    }

    const feedback = new Feedback({
      username: req.user.username,
      busId,
      rating,
      comments,
    });

    await feedback.save();
    res.redirect('/show-my-tickets'); // Redirect back to the tickets page
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).send('Something went wrong.');
  }
});

router.get('/feedback/:busId', async (req, res) => {
  try {
    const { busId } = req.params;
    console.log('Received busId:', busId); // Debugging

    if (!mongoose.Types.ObjectId.isValid(busId)) {
      return res.status(400).send('Invalid bus ID.');
    }

    const feedbacks = await Feedback.find({ busId }).sort({ createdAt: -1 });
    res.render('feedback', { busId });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).send('Something went wrong.');
  }
});

const stripe = Stripe('sk_test_51R1RLxEoZuUWOxipZkoussrrKWHqNPXKJO64Y0RRF1Dk6BNDYE9vlk0ZA1IENRHiZIVKo1dhUzblX5Nbh8ta8k0u00nn8sYr4v');

router.post('/create-checkout-session', async (req, res) => {
  try {
    console.log("✅ Received request to /create-checkout-session");

    const { busId, username, seats, fare } = req.body;

    const passengers = [];
    for (let i = 0; i < seats; i++) {
      passengers.push({
        name: req.body[`passengers[${i}][name]`],
        gender: req.body[`passengers[${i}][gender]`],
        age: req.body[`passengers[${i}][age]`],
        email: req.body[`passengers[${i}][email]`],
        phone: req.body[`passengers[${i}][phone]`]
      });
    }

    console.log("🔹 Received Data:", { busId, username, seats, fare, passengers });

    if (!busId || !seats || !fare || passengers.length === 0) {
      console.error("❌ Missing booking details");
      return res.status(400).json({ error: "Missing required booking details." });
    }

    req.session.bookingData = { busId, username, seats, fare, passengers };
    console.log("✅ Stored booking data in session:", req.session.bookingData);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'inr',
          product_data: { name: "Bus Ticket" },
          unit_amount: fare * 100,
        },
        quantity: seats,
      }],
      mode: 'payment',
      success_url: `https://busify-0ru5.onrender.com/confirm-booking?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: 'https://busify-0ru5.onrender.com/payment-failed',
    });

    console.log("✅ Stripe Session Created:", session.id);
    res.json({ url: session.url });

  } catch (error) {
    console.error('❌ Stripe Error:', error);
    res.status(500).json({ error: "Something went wrong with payment processing." });
  }
});

router.get('/payment-failed', (req, res) => {
  res.send('payment-failed'); 
});

function isLoggedIn (req , res , next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

function isAdmin (req, res, next) {
  if (req.user && req.user.role === 'admin') { 
      return next();
  } else {
      res.status(403).send('Access denied. Admins only.');
  }
};

module.exports = router;
