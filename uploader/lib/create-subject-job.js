const SubjectJob = require('../lib/subject-job')

module.exports = function (job, done) {
    const jobInst = new SubjectJob(job.file, job.username, job.password)
    jobInst.onFinish(done)
    return jobInst
}