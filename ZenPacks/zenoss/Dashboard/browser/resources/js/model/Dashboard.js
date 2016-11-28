/*****************************************************************************
 *
 * Copyright (C) Zenoss, Inc. 2012, all rights reserved.
 *
 * This content is made available according to terms specified in
 * License.zenoss under the directory where your Zenoss product is installed.
 *
 ****************************************************************************/

(function() {
    /**
     * @class Zenoss.Dashboard.UserGroupStore
     * @extend Zenoss.DirectStore
     * Direct store for loading user groups
     */
    Ext.define("Zenoss.Dashboard.UserGroupStore", {
        extend: "Zenoss.NonPaginatedStore",
        constructor: function(config) {
            config = config || {};
            Ext.applyIf(config, {
                model: 'Zenoss.model.Basic',
                initialSortColumn: "name",
                directFn: Zenoss.remote.DashboardRouter.getCurrentUsersGroups,
                root: 'data'
            });
            this.callParent(arguments);
        }
    });

    /**
     * Model that defines a uid and name
     **/
    Ext.define("Zenoss.Dashboard.model.Dashboard", {
        extend: 'Ext.data.Model',
        idProperty: 'uid',
        fields: ['uid', 'id', 'name', 'columns', 'contextUid', 'contextType', 'state', 'owner', 'locked', 'audit',
                 {
                     name: 'idwithOwner',
                     convert: function(v, record){
                         return Ext.String.format("{0} ({1})", record.data.id, record.data.owner);
                     }
                 }]
    });

    /**
     * @class Zenoss.Dashboard.model.Dashboard
     * @extend Zenoss.DirectStore
     * Direct store for loading dashboards
     */
    Ext.define("Zenoss.Dashboard.model.DashboardStore", {
        extend: "Zenoss.NonPaginatedStore",
        constructor: function(config) {
            config = config || {};
            Ext.applyIf(config, {
                model: 'Zenoss.Dashboard.model.Dashboard',
                initialSortColumn: "id",
                autoLoad: true,
                directFn: Zenoss.remote.DashboardRouter.getAvailableDashboards,
                root: 'data'
            });
            this.callParent(arguments);
        }
    });

}());
