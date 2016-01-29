FROM ubuntu:15.10
MAINTAINER  Sylvain Lasnier <sylvain.lasnier@gmail.com>

# Add useful packages
ENV DEBIAN_FRONTEND noninteractive
RUN apt-get update && apt-get -y upgrade && apt-get -y install curl bash-completion vim-tiny supervisor wget aptitude && apt-get clean

# Setup root password for login process
RUN echo root:root | chpasswd

# Language setup
RUN locale-gen  fr_FR.UTF-8 en_US.UTF-8
RUN update-locale LANG=en_US.UTF-8

# Common alias
RUN alias ls='ls --color=auto'
RUN alias ll='ls -halF'

# Install app dependencies
RUN apt-get update
RUN apt-get install -y make gcc pkg-config
RUN apt-get install -y libexiv2-dev
RUN apt-get install -y sudo
RUN curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash -
RUN apt-get install -y nodejs
RUN apt-get install -y imagemagick
RUN apt-get install -y git

RUN git clone https://github.com/zooniverse/generate-subjects-from-planet-api.git && cd /generate-subjects-from-planet-api && git fetch origin before-after && git checkout before-after

COPY package.json /generate-subjects-from-planet-api/package.json
RUN cd /generate-subjects-from-planet-api; npm install

# Bundle app source
COPY . /generate-subjects-from-planet-api
RUN npm install

EXPOSE 8080
CMD ["node", "/uploader/app.js"]
