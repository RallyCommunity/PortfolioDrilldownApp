(function () {
  var Ext = window.Ext4 || window.Ext;

  Ext.define('Rally.ui.renderer.template.FormattedIDTemplate2', {
    override: 'Rally.ui.renderer.template.FormattedIDTemplate',

    createIcon: function(data){
      console.log('showIcon', this.showIcon, data);
      if (this.showIcon === false) {
        return '';
      }
      var className = '';
      switch (data._type.toLowerCase().split('/')[0]) {
        case 'userstory':
          case 'hierarchicalrequirement':
          className = 'story';
          break;
        case 'defect':
          className = 'defect';
          break;
        case 'task':
          className = 'task';
          break;
        case 'testcase':
          className = 'test-case';
          break;
        case 'defectsuite':
          className = 'defect-suite';
          break;
        case 'testset':
          className = 'test-set';
          break;
        case 'portfolioitem':
          className = 'portfolioitem';
          break;
      }

      console.log(className);
      return className ? '<span class="artifact-icon icon-' + className + '"></span>' : className;
    }
  });
}());
