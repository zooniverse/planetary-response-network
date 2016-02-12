'use strict'
const fork = require('child_process').fork

const SCRIPT = __dirname + '/../../planet-api-before-after-test'

module.exports = class SubjectJob {
    constructor (file, username, password) {
        // Store params
        this.file = file
        this.username = username
        this.password = password
        
        // Create child process
        this.job = fork(SCRIPT, [this.file], Object.assign(process.env, {
            ZOONIVERSE_USERNAME: this.username,
            ZOONIVERSE_PASSWORD: this.password
        }))
        
        // @todo store output from child process
        this.output = []
        
        // Set up callback
        this.job.on('close', code => {
            if (this.done) this.done(code > 0, this.output.join("\n"))
        })
    }
    
    // Sets the callback for the job
    onFinish (done) {
        this.done = done
    }
}