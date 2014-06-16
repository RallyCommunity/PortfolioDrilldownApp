(function() {
  var Ext = window.Ext4 || window.Ext;

  /**
   *      * @private
   *           * Adds a component that allows the user to choose which artifact types are displayed on a GridBoard
   *                */
  Ext.define('Rally.ui.gridboard.plugin.GridBoardPortfolioItemTypeChooser', {
    alias: 'plugin.rallygridboardportfolioitemtypechooser',
    extend: 'Ext.AbstractPlugin',
    mixins: [
      'Rally.ui.gridboard.plugin.GridBoardControlShowable',
      'Ext.util.Observable'
    ],

    init: function (cmp) {
      this.cmp = cmp;

      this.showControl();
    },

    getControlCmpConfig: function () {
      console.log('getConfig');
      var me = this;

      return {
        xtype: 'rallyportfolioitemtypecombobox',
        listeners: {
          scope: me,
          change: function (t, newVal, oldVal, eOpts) {
            //console.dir(t.store.getAt(t.store.find('_ref', newVal)));
            if (oldVal) {
              this._changeTopLevelPI(t.store.getAt(t.store.find('_ref', newVal)));
            }
          }
        }
      };
    },

    _changeTopLevelPI: function (typeRec) {
      var gridOrBoard = this.cmp.getGridOrBoard();
      var type = typeRec.get('TypePath');

      console.log(this.cmp.getToggleState());
      if (this.cmp.getToggleState() === 'grid') {
        gridOrBoard.store.parentTypes = [type];
        gridOrBoard.refresh();
      }
    }
  });
})();
