FROM ubuntu:14.04
MAINTAINER Sascha Ishikawa <sascha@zooniverse.org>

WORKDIR /generate-subjects-from-planet-api

# Add useful packages
ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update && apt-get -y upgrade && \
    apt-get install --no-install-recommends -y ca-certificates sudo git curl bash-completion vim-tiny imagemagick libexiv2-dev make g++

RUN curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash -

#RUN which python3

RUN apt-get install --no-install-recommends -y nodejs && apt-get clean

# Language setup
RUN locale-gen  fr_FR.UTF-8 en_US.UTF-8
RUN update-locale LANG=en_US.UTF-8

# Common alias
RUN alias ls='ls --color=auto'
RUN alias ll='ls -halF'

ADD ./ /generate-subjects-from-planet-api

#RUN npm install .

EXPOSE 3736
CMD ["node", "/generate-subjects-from-planet-api/uploader/app.js"]
