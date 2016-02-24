import { Link } from 'react-router';
import React, { PropTypes } from 'react';
import DocumentTitle from 'react-document-title';
import Header from './Header'

export default class LoginPage extends React.Component {
  render() {
    return (
      <DocumentTitle title='AOI Uploader'>
        <div className='LoginPage'>
          <Header/>
          <div className='container'>
            <h2 className='text-center'>User Login</h2>
            <hr />
            <div className='jumbotron'>
              <p>
                <strong>
                  Login!
                </strong>
              </p>
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam pulvinar porttitor massa ut fermentum. Phasellus ac augue at libero auctor eleifend a id mi. Sed leo lorem, feugiat ut velit vitae, rhoncus semper dui. Aenean placerat risus vitae hendrerit sodales. Praesent gravida magna eget quam egestas, eget ornare enim malesuada. Suspendisse eros orci, dignissim convallis tincidunt et, venenatis eget dui. Nam a tellus semper leo vestibulum porta eget in elit. Nullam suscipit neque id felis ullamcorper semper. Ut lacus tellus, luctus nec ullamcorper ac, blandit ut lorem. Nam egestas, massa sit amet auctor aliquet, sem tellus vestibulum neque, quis tristique erat justo id leo. Duis faucibus elementum enim ut porttitor. Phasellus tempor libero id lacus aliquet, eu fermentum sapien malesuada. Aliquam erat volutpat. Sed vel feugiat dolor, vitae consequat quam.
              </p>
            </div>
          </div>
        </div>
      </DocumentTitle>
    );
  }
}
