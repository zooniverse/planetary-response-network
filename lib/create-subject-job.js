const SubjectJob = require('../lib/subject-job')

module.exports = function (job, done) {
    const jobInst = new SubjectJob(job.file)
    jobInst.onFinish(done)
    return jobInst
}