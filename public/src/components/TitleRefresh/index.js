import React, { Component, PropTypes } from 'react';
import styles from './main.scss';
import { shouldComponentUpdate } from 'react/lib/ReactComponentWithPureRenderMixin';

export default class TitleRefresh extends Component {
  constructor() {
    super();
    this.shouldComponentUpdate = shouldComponentUpdate.bind(this);
  }
  componentDidMount() {
    if (this.iframe) {
      this.iframe.src = 'http://w.jenniferstudio.cn/favicon.ico';
    }
  }
  render() {
    return <iframe ref={ iframe => this.iframe = iframe }/>;
  }
}
