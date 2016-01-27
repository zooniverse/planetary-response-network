var Uploader = function (el, options) {
  // Prefer a form element
  if (el.tagName.toLowerCase() !== 'form') console.warn('PLease consider using a <form> element for backwards compatibility')
  // Apply options
  this.options = Object.assign({}, options, Uploader.DEFAULT_OPTIONS)
  // Try to infer target URL from form element
  if (!this.options.target) this.options.target = el.action
  if (!this.options.target) throw new Error('You must pass a target URL for the upload')


  this.el = el
  this.input = el.querySelector('input[type="file"]')
  this.button = el.querySelector('button[type="submit"]')

  if (this.TESTS.dnd && this.TESTS.formdata) {
    // Modern browser with drag and drop and XHR2 support
    if (this.TESTS.progress) {
      // Create progress bar
      this.progress = document.createElement('progress')
      this.progress.value = 0
      this.progress.min = 0
      this.progress.max = 100
      this.el.appendChild(this.progress)
    }
    // Add drag and drop listeners
    this.el.ondragover = this.onDragOver.bind(this)
    this.el.ondragend = this.onDragEnd.bind(this)
    this.el.ondrop = this.onDrop.bind(this)

    // Enable adding file via input/label click
    this.input.addEventListener('change', this.onInputChange.bind(this))

    // Hide superfluous elements
    this.input.classList.add('is-hidden')
    this.button.classList.add('is-hidden')
  }

}

Uploader.prototype = {
  DEFAULT_OPTIONS: {
    acceptedTypes: [
      'image/png',
      'image/jpeg',
      'image/gif'
    ]
  },

  TESTS: {
    filereader: typeof FileReader != 'undefined',
    dnd: 'draggable' in document.createElement('span'),
    formdata: !!window.FormData,
    progress: 'upload' in new XMLHttpRequest()
  },

  onInputChange: function (e) {
    this.readFiles(e.target.files)
  },

  onDragOver: function (e) {
    this.el.classList.add('is-hovered')
    return false
  },

  onDragEnd: function (e) {
    this.el.classList.remove('is-hovered')
    return false
  },

  onDrop: function (e) {
    e.preventDefault()
    this.el.classList.remove('is-hovered')
    this.readFiles(e.dataTransfer.files)
  },

  readFiles: function(files) {
    var formData = new FormData()
    var validCount = 0
    var i
    for (i = 0; i < files.length; i++) {
      if (this.options.acceptedTypes.indexOf(files[i].type) > -1) {
        validCount++
      }
    }

    if (validCount < files.length) {
      alert(validCount > 0 ? 'Some of the files you have chosen are not valid types and will not be uploaded' : 'None of the files you have chosen are valid types. They will not be uploaded.')
      return
    }

    for (i = 0; i < files.length; i++) {
      formData.append('file', files[i])
    }

    // now post a new XHR request
    var xhr = new XMLHttpRequest();
    xhr.open('POST', this.options.target);
    progress = this.progress
    xhr.onload = function() {
      progress.value = progress.innerHTML = 100;
    }

    if (this.TESTS.progress) {
      progress.value = 0
      xhr.upload.onprogress = function (event) {
        if (event.lengthComputable) {
          var complete = (event.loaded / event.total * 100 | 0);
          progress.value = progress.innerHTML = complete;
        }
      }
    }

    xhr.send(formData);
  }
}
