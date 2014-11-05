Ext.define('Zenoss.Dashboard.model.Stock', {
    extend: 'Ext.data.Model',
    fields: [
        {name: 'company'},
        {name: 'change',     type: 'float'},
        {name: 'pctChange',  type: 'float'}
    ]
});
