import { Link } from 'react-router';
import React, { PropTypes } from 'react';
import DocumentTitle from 'react-document-title';
import Header from './Header'

export default class IndexPage extends React.Component {
  render() {
    return (
      <DocumentTitle title='AOI Uploader'>
        <div className='IndexPage'>
          <Header/>
          <div className='container'>
            <h2 className='text-center'>AOI Uploader App</h2>
            <hr />
            <div className='jumbotron'>
              <p>
                <strong>
                  Generate subjects for your Zooniverse project from satellite data.
                </strong>
              </p>
              <p>
                This app enables you to upload a geographic area of interest (AOI) as a KML file, used to fetch satellite mosaics that overlap with the region.
                The mosaics are tilized, uploaded to an AWS S3 bucket, and subjects are generated and loaded into your Zooniverse project.
              </p>
            </div>
          </div>
        </div>
      </DocumentTitle>
    );
  }
}
