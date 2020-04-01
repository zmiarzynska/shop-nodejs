if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config()
        //require('dotenv').load()
}
const stripeSecretKey=process.env.STRIPE_SECRET_KEY
const stripePublicKey=process.env.STRIPE_PUBLIC_KEY
console.log(stripePublicKey)

const express = require ('express')
const app = express()
const fs=require('fs')
const stripe = require('stripe')(stripeSecretKey)

app.use(express.json())
const bcrypt=require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')


const initializePassport = require('../passport-config')
initializePassport(
     passport,
    email => users.find(user => user.email === email),
     id=> users.find(user => user.id === id)
    )

const users=[]

app.set('view-engine','ejs')
app.use(express.static('public'))
//poniewaz uzywam info z form
app.use(express.urlencoded({extended: false}))
app.use(flash())
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())



app.get('/login',(req,res)=>{
    res.render('login.ejs')
})

app.post('/login', passport.authenticate('local',{
    successRedirect: '/store',
    failureRedirect: '/login',
    failureFlash:true

}))

app.get('/register',(req,res)=>{
    res.render('register.ejs')
})

app.post('/register',async (req,res)=>{
try{
    const hashedPassword =await bcrypt.hash(req.body.password,10)
    users.push({
        id: Date.now().toString(),
        name: req.body.name,
        email: req.body.email,
        password: hashedPassword
    })
    res.redirect('/login')
} catch {
    res.redirect('/register')
}
console.log(users)
})

function checkAuthenticated(req,res,next) {
    if(req.isAuthenticated()){
        return next()
    }
    res.redirect('login')
}




app.get('/store',checkAuthenticated, function(req, res) {
    fs.readFile('items.json', function(error, data) {
        if (error) {
            res.status(500).end()
        } else {
            res.render('store.ejs', {
                stripePublicKey: stripePublicKey,
                items: JSON.parse(data),
                name: req.user.name,
            })
        }
    })
})

app.post('/purchase', function(req, res) {
    fs.readFile('items.json', function(error, data) {
        if (error) {
            res.status(500).end()
        } else {
            const itemsJson = JSON.parse(data.toString())
            const itemsArray = itemsJson.music.concat(itemsJson.merch)
            let total = 0
            req.body.items.forEach(function(item) {
                const itemJson = itemsArray.find(function(i) {
                     return i.id == item.id
                })
                total = total + itemJson.price * item.quantity
            })

            stripe.charges.create({
                amount: total,
                source: req.body.stripeTokenId,
                currency: 'usd'
            }).then(function() {
                console.log('Charge Successful')
                res.json({ message: 'Successfully purchased items' })
            }).catch(function() {
                console.log('Charge Fail')
                res.status(500).end()
            })
        }
    })
})

app.listen(3000)
