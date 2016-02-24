'use strict'
const path = require('path')
const fork = require('child_process').fork

const SCRIPT = path.join(__dirname, '../../planet-api-before-after-test')

module.exports = class SubjectJob {
    constructor (file, username, password) {
        // Store params
        this.file = file
        this.username = username
        this.password = password
        
        // Create child process
        this.job = fork(SCRIPT, [this.file], {
            env: Object.assign(process.env, {
                ZOONIVERSE_USERNAME: this.username,
                ZOONIVERSE_PASSWORD: this.password
            }),
            cwd: path.join(__dirname, '../..')
        })
        
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