import React from 'react';
import ReactDOM from 'react-dom';
import { Router, IndexRoute, Route } from 'react-router';
import createBrowserHistory from 'history/lib/createBrowserHistory';
import { IndexPage, UploadPage, BuildsPage, SettingsPage, LoginPage } from './pages';

ReactDOM.render(
  <Router history={createBrowserHistory()}>
    <Route path='/'         component={IndexPage}/>
    <Route path='/upload'   component={UploadPage}/>
    <Route path='/builds'   component={BuildsPage}/>
    <Route path='/settings' component={SettingsPage}/>
    <Route path='/login'    component={LoginPage}/>
  </Router>,
  document.getElementById('app-container')
);
