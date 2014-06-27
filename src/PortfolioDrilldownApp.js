(function () {
  var Ext = window.Ext4 || window.Ext;

  /**
   * Iteration Tracking Board App
   * The Iteration Tracking Board can be used to visualize and manage your User Stories and Defects within an Iteration.
   */
  Ext.define('Rally.apps.portfoliodrilldown.PortfolioDrilldownApp', {
    extend: 'Rally.app.App',
    requires: [
      'Rally.data.Ranker',
      'Rally.ui.gridboard.GridBoard',
      'Rally.ui.grid.TreeGrid',
      'Rally.data.wsapi.TreeStoreBuilder',
      'Rally.ui.cardboard.plugin.FixedHeader',
      'Rally.ui.cardboard.plugin.Print',
      'Rally.ui.gridboard.plugin.GridBoardAddNew',
      'Rally.ui.gridboard.plugin.GridBoardOwnerFilter',
      'Rally.ui.gridboard.plugin.GridBoardFilterInfo',
      'Rally.ui.gridboard.plugin.GridBoardArtifactTypeChooser',
      'Rally.ui.gridboard.plugin.GridBoardFieldPicker',
      'Rally.ui.cardboard.plugin.ColumnPolicy',
      'Rally.ui.gridboard.plugin.GridBoardFilterInfo',
      'Rally.ui.gridboard.plugin.GridBoardFilterControl',
      'Rally.ui.gridboard.plugin.GridBoardToggleable',
      'Rally.ui.grid.plugin.TreeGridExpandedRowPersistence',
      'Rally.ui.gridboard.plugin.GridBoardExpandAll',
      'Rally.ui.gridboard.plugin.GridBoardCustomView',
      'Rally.ui.filter.view.ModelFilter',
      'Rally.ui.filter.view.OwnerFilter',
      'Rally.ui.filter.view.OwnerPillFilter',
      'Rally.ui.filter.view.TagPillFilter',
      'Rally.app.Message',
      'Rally.clientmetrics.ClientMetricsRecordable'
    ],

    mixins: [
      'Rally.app.CardFieldSelectable',
      'Rally.clientmetrics.ClientMetricsRecordable'
    ],
    componentCls: 'portfoliotracking',
    alias: 'widget.rallyportfoliotracking',

    settingsScope: 'project',
    //scopeType: 'release',
    autoScroll: false,

    config: {
      defaultSettings: {
        ignoreProjectScoping: true
      }
    },

    eModelNames: ['User Story', 'Defect', 'Defect Suite', 'Test Set'],
    sModelNames: [],

    getSettingsFields: function () {
      var fields = this.callParent(arguments);
      fields.push({
        name: 'ignoreProjectScoping',
        xtype: 'rallycheckboxfield',
        label: 'Show Children in any Project'
      });

      fields.push({
        type: 'query'
      });

      return fields;
    },

    onTimeboxScopeChanged: function (timebox) {
      this.callParent(arguments);

    },

    launch: function() {
      if(!this.rendered) {
        this.on('afterrender', this.launch, this, {single: true});
        return;
      }

      var typeStore = Ext.create('Rally.data.wsapi.Store', {
        autoLoad: false,
        model: 'TypeDefinition',
        sorters: [{
          property: 'Ordinal',
          direction: 'ASC'
        }],
        filters: [{
          property: 'Parent.Name',
          operator: '=',
          value: 'Portfolio Item'
        }, {
          property: 'Creatable',
          operator: '=',
          value: true
        }]
      });

      typeStore.load({
        scope: this,
        callback: function (records) {
          this.sModelNames = _.map(records, function (rec) { return rec.get('TypePath'); });
          this.sModelMap = _.transform(records, function (acc, rec) { acc[rec.get('TypePath')] = rec; }, {});

          this._getGridStore().then({
            success: function(gridStore) {
              var model = gridStore.model;
              this._addGridBoard(gridStore);
              gridStore.on('parenttypeschange', function () {
                if (gridStore.isLoading()) {
                  gridStore.on('load', function () {
                    gridStore.reload();
                  }, this, { single: true });
                } else {
                  gridStore.load();
                }
              }, this);
            },
            scope: this
          });
        }
      });

    },

    _getModelNames: function () {
      return _.union(this.sModelNames, this.eModelNames);
    },

    _getGridStore: function() {
      var query = [];

     if (this.getSetting('query')) {
       query.push(Rally.data.wsapi.Filter.fromQueryString(this.getSetting('query')));
     }

      var context = this.getContext(),
          config = {
            models: this._getModelNames(),
            autoLoad: false,
            remoteSort: true,
            filters: query,
            root: {expanded: true},
            enableHierarchy: true,
            expandingNodesRespectProjectScoping: !this.getSetting('ignoreProjectScoping')
          };

      return Ext.create('Rally.data.wsapi.TreeStoreBuilder').build(config).then({
        success: function (store) {
          return store;
        }
      });
    },

    _addGridBoard: function (gridStore) {
      var context = this.getContext();

      this.remove('gridBoard');

      this.gridboard = this.add({
        itemId: 'gridBoard',
        xtype: 'rallygridboard',
        stateId: 'portfoliotracking-gridboard',
        context: context,
        plugins: this._getGridBoardPlugins(),
        modelNames: this._getModelNames(),
        gridConfig: this._getGridConfig(gridStore),
        addNewPluginConfig: {
          style: {
            'float': 'left',
            'margin-right': '5px'
          }
        },
        listeners: {
          load: this._onLoad,
          toggle: this._onToggle,
          recordupdate: this._publishContentUpdatedNoDashboardLayout,
          recordcreate: this._publishContentUpdatedNoDashboardLayout,
          scope: this
        },
        height: Math.max(this.getAvailableGridBoardHeight(), 150)
      });
    },

    /**
     * @private
     */
    getAvailableGridBoardHeight: function() {
      var height = this.getHeight();
      return height;
    },

    _getGridBoardPlugins: function() {
      var plugins = ['rallygridboardaddnew'],
      context = this.getContext();


      //plugins.push('rallygridboardtoggleable');
      var alwaysSelectedValues = ['FormattedID', 'Name', 'Owner'];
      if (context.getWorkspace().WorkspaceConfiguration.DragDropRankingEnabled) {
        alwaysSelectedValues.push('DragAndDropRank');
      }

      plugins.push({
        ptype: 'rallygridboardfilterinfo',
        isGloballyScoped: Ext.isEmpty(this.getSetting('project')),
        stateId: 'portfolio-tracking-owner-filter-' + this.getAppId()
      });

      plugins.push({
        ptype: 'rallygridboardfieldpicker',
        headerPosition: 'left',
        gridFieldBlackList: [
          'ObjectID',
          'Description',
          'DisplayColor',
          'Notes',
          'Subscription',
          'Workspace',
          'Changesets',
          'RevisionHistory',
          'Children'
        ],
        alwaysSelectedValues: alwaysSelectedValues,
        modelNames: this._getModelNames(),
        boardFieldDefaults: (this.getSetting('cardFields') && this.getSetting('cardFields').split(',')) ||
          ['Parent', 'Tasks', 'Defects', 'Discussion', 'PlanEstimate', 'Iteration']
      });

      plugins.push('rallygridboardportfolioitemtypechooser');

      return plugins;
    },

    setHeight: Ext.Function.createBuffered(function() {
      this.superclass.setHeight.apply(this, arguments);
      this._resizeGridBoardToFillSpace();
    }, 100),

    _resizeGridBoardToFillSpace: function() {
      if(this.gridboard) {
        this.gridboard.setHeight(this.getAvailableGridBoardHeight());
      }
    },

    _getGridConfig: function (gridStore) {
      var context = this.getContext(),
      stateString = 'portfolio-tracking-treegrid',
      stateId = context.getScopedStateId(stateString);

      var gridConfig = {
        xtype: 'rallytreegrid',
        store: gridStore,
        enableRanking: this.getContext().getWorkspace().WorkspaceConfiguration.DragDropRankingEnabled,
        columnCfgs: null, //must set this to null to offset default behaviors in the gridboard
        defaultColumnCfgs: this._getGridColumns(),
        showSummary: true,
        summaryColumns: this._getSummaryColumnConfig(),
        //treeColumnRenderer: function (value, metaData, record, rowIdx, colIdx, store, view) {
          //store = store.treeStore || store;
          //return Rally.ui.renderer.RendererFactory.getRenderTemplate(store.model.getField('FormattedID')).apply(record.data);
        //},
        //enableBulkEdit: context.isFeatureEnabled('BETA_TRACKING_EXPERIENCE'),
        plugins: [],
        stateId: stateId,
        stateful: true
        //pageResetMessages: [Rally.app.Message.timeboxScopeChange]
      };

      return gridConfig;
    },

    _getSummaryColumnConfig: function () {
      var taskUnitName = this.getContext().getWorkspace().WorkspaceConfiguration.TaskUnitName,
      planEstimateUnitName = this.getContext().getWorkspace().WorkspaceConfiguration.IterationEstimateUnitName;

      return [
        {
        field: 'AcceptedLeafStoryCount',
        type: 'sum',
        units: 'Total'
      },
      {
        field: 'AcceptedLeafStoryPlanEstimateTotal',
        type: 'sum',
        units: planEstimateUnitName
      },
      {
        field: 'LeafStoryCount',
        type: 'sum',
        units: 'Total'
      },
      {
        field: 'LeafStoryPlanEstimateTotal',
        type: 'sum',
        units: planEstimateUnitName
      },
      {
        field: 'UnEstimatedLeafStoryCount',
        type: 'sum',
        units: 'Total'
      }
      ];
    },

    _getGridColumns: function (columns) {
      var result = ['FormattedID', 'Name', 'State', 'PercentDoneByStoryPlanEstimate', 'ScheduleState', 'Blocked', 'PlanEstimate', 'Owner', 'Discussion'];

      if (columns) {
        result = columns;
      }
      _.pull(result, 'FormattedID');

      return result;
    },

    _onLoad: function () {
      this._publishContentUpdated();
      this.recordComponentReady();
    },

    _onBoardFilter: function () {
      this.setLoading(true);
    },

    _onBoardFilterComplete: function () {
      this.setLoading(false);
    },

    _onToggle: function (toggleState) {
      var appEl = this.getEl();

      if (toggleState === 'board') {
        appEl.replaceCls('grid-toggled', 'board-toggled');
      } else {
        appEl.replaceCls('board-toggled', 'grid-toggled');
      }
      this._publishContentUpdated();
    },

    _publishContentUpdated: function () {
      this.fireEvent('contentupdated');
    },

    _publishContentUpdatedNoDashboardLayout: function () {
      this.fireEvent('contentupdated', {dashboardLayout: false});
    }
  });
})();
