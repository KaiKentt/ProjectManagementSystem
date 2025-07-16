// Question 2a: Require modules and setup Express
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');


const app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Question 2b
mongoose.connect('mongodb://localhost:27017/projectmgmt')
    .then(() => {
        console.log('Connected to MongoDB successfully!');
    })
    .catch((error) => {
        // Error handling
        console.error('Database connection error:', error);
        process.exit(1);
    });

// Question 2c
const projectSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    objective: {
        type: String,
        required: true,
        trim: true
    },
    scope: {
        type: String,
        required: true,
        trim: true
    },
    duration: {
        type: Number,
        required: true,
        min: 1
    },
    budget: {
        type: Number,
        required: true,
        min: 0
    },
    score: {
        type: Number,
        default: 0
    },
    // Store individual criterion scores for display
    competition: {
        type: Number,
        required: true,
        min: 1,
        max: 10
    },
    potentialRevenue: {
        type: Number,
        required: true,
        min: 1,
        max: 10
    },
    cost: {
        type: Number,
        required: true,
        min: 1,
        max: 10
    },
    customerValue: {
        type: Number,
        required: true,
        min: 1,
        max: 10
    }
});

// Create model for projects collection
const Project = mongoose.model('Project', projectSchema);

// Question 2e: Define routes

// GET root route
app.get('/', (req, res) => {
    try {
        res.render('index');
    } catch (error) {
        console.error('Error rendering index page:', error);
        res.status(500).send('Internal Server Error');
    }
});

// GET /projects route
app.get('/projects', async (req, res) => {
    try {
        // Retrieve all projects from MongoDB and sort by score (high to low)
        const projects = await Project.find().sort({ score: -1 });
        res.render('projects', { projects });
    } catch (error) {
        console.error('Error retrieving projects:', error);
        res.status(500).render('error', {
            message: 'Unable to retrieve projects. Please try again later.'
        });
    }
});

// GET new project route
app.get('/projects/new', (req, res) => {
    try {
        res.render('new_project');
    } catch (error) {
        console.error('Error rendering new project page:', error);
        res.status(500).send('Internal Server Error');
    }
});

// POST calculate project score
app.post('/projects', async (req, res) => {
    try {
        const { title, objective, scope, duration, budget, competition, potentialRevenue, cost, customerValue } = req.body;

        if (!title || !objective || !scope || !duration || !budget || !competition || !potentialRevenue || !cost || !customerValue) {
            return res.status(400).render('new_project', {
                error: 'All fields are required. Please fill in all information.'
            });
        }

        const scores = [competition, potentialRevenue, cost, customerValue];
        for (let score of scores) {
            if (score < 1 || score > 10) {
                return res.status(400).render('new_project', {
                    error: 'All criterion scores must be between 1 and 10.'
                });
            }
        }

        // Calculate weighted score using predefined weights
        const weights = {
            competition: 0.1,
            potentialRevenue: 0.3,
            cost: 0.2,
            customerValue: 0.4
        };

        const totalWeightedScore =
            (weights.competition * parseFloat(competition)) +
            (weights.potentialRevenue * parseFloat(potentialRevenue)) +
            (weights.cost * parseFloat(cost)) +
            (weights.customerValue * parseFloat(customerValue));

        // Create new project with input data and calculated score
        const newProject = new Project({
            title,
            objective,
            scope,
            duration: parseFloat(duration),
            budget: parseFloat(budget),
            competition: parseFloat(competition),
            potentialRevenue: parseFloat(potentialRevenue),
            cost: parseFloat(cost),
            customerValue: parseFloat(customerValue),
            score: Math.round(totalWeightedScore * 10) / 10
        });


        await newProject.save();
        res.redirect('/projects');

    } catch (error) {
        console.error('Error saving project:', error);

        if (error.name === 'ValidationError') {
            const errorMessages = Object.values(error.errors).map(err => err.message);
            return res.status(400).render('new_project', {
                error: 'Validation Error: ' + errorMessages.join(', ')
            });
        }

        res.status(500).render('new_project', {
            error: 'Unable to save project. Please try again.'
        });
    }
});


app.use((req, res) => {
    res.status(404).render('error', {
        message: 'Page not found. The requested page does not exist.'
    });
});


app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    res.status(500).render('error', {
        message: 'Something went wrong. Please try again later.'
    });
});

// Start server 
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

module.exports = app;
