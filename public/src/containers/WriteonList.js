import React, { Component, PropTypes } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Link } from 'react-router';
import Helmet from 'react-helmet';
import * as IndexActions from '../actions';

import getMuiTheme from 'material-ui/styles/getMuiTheme';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import AppBar from 'material-ui/AppBar';

import RaisedButton from 'material-ui/RaisedButton';
import TextField from 'material-ui/TextField';
import {List, ListItem} from 'material-ui/List';
import Avatar from 'material-ui/Avatar';
import IconCreate from 'material-ui/svg-icons/image/navigate-next';

import Divider from 'material-ui/Divider';
import FileFolder from 'material-ui/svg-icons/file/folder';
import ActionAssignment from 'material-ui/svg-icons/action/assignment';
import {grey500} from 'material-ui/styles/colors';

import DropDownMenu from 'material-ui/DropDownMenu';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import Loader from '../components/Loader';

import { dateFormat } from '../common/js/utility';

const style = {
  infoContainer: {
    textAlign: 'center',
    margin: 20
  }
};

class WriteonList extends Component {
  constructor() {
    super();
    this.currentClass = null;
    this.state = {
      classIndex: 0
    }
  }

  componentDidMount() {
    const { fetchWriteonList } = this.props.actions;
    fetchWriteonList && fetchWriteonList();
  }

  handleClassChange = (event, index, value) => this.setState({
    classIndex: index
  });

  renderMyClasses() {
    const { myClasses } = this.props.value.app;
    if (myClasses && myClasses.length > 0) {
      const classList = myClasses.map((clazz, index) =>
        <MenuItem key={index} value={clazz.clazz_id} primaryText={clazz.clazz_name} />
      );
      // console.log(myClasses[0].clazz_id);
      return (
        <div style={{paddingLeft: 10}}>
        当前班级
        <DropDownMenu
          value={myClasses[this.state.classIndex].clazz_id}
          onChange={this.handleClassChange}>
          {classList}
        </DropDownMenu>
        </div>
      );
    } else {
      // 无班级列表
      return (
        <div style={style.infoContainer}>
        没有您的班级信息！
        </div>
      )
    }
  }

  // 渲染列表
  renderWriteonList() {
    if (this.currentClass && this.currentClass.writeons) {
      let currentList = this.currentClass.writeons;
      if (currentList.length > 0) {
        return currentList.map((writeon, index) =>
          <Link key={index} to={`/writeon/detail/${writeon.writeon_id}`}>
          <ListItem
            key={index}
            leftAvatar={<Avatar icon={<ActionAssignment />} backgroundColor={grey500} />}
            rightIcon={<IconCreate />}
            primaryText={writeon.writeon_name}
            secondaryText={dateFormat(new Date(parseInt(writeon.create_date)*1000), 'yyyy-MM-dd')}
          />
          </Link>
        )
      }
    }
    return (
      <div style={style.infoContainer}>
        当前没有课程板书！
      </div>
    );
  }

  renderLoading() {
    const { isFetching } = this.props.value.app;
    return (
      <Loader visible={ isFetching } />
    );
  }

  render() {
    const { myClasses } = this.props.value.app;
    this.currentClass = myClasses[this.state.classIndex];
    return (
      <div>
        <Helmet title="课程板书" />
        <MuiThemeProvider muiTheme={ getMuiTheme({userAgent: this.props.value.userAgent}) }>
        <div>
          <AppBar title="课程板书" />
          {this.renderMyClasses()}
          <List>
          {this.renderWriteonList()}
          </List>
        </div>
        </MuiThemeProvider>
        {this.renderLoading()}
      </div>
    );
  }
}

WriteonList.propTypes = {
};

const mapStateToProps = state => ({ value: state });

const mapDispatchToProps = dispatch => (
  { actions: bindActionCreators(IndexActions, dispatch) }
);

export default connect(mapStateToProps, mapDispatchToProps)(WriteonList);