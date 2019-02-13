/**
 * @class Ext.app.PortalPanel
 * @extends Ext.panel.Panel
 * A {@link Ext.panel.Panel Panel} class used for providing drag-drop-enabled portal layouts.
 */
Ext.define('Zenoss.Dashboard.view.PortalPanel', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.portalpanel',

    requires: ['Zenoss.Dashboard.view.PortalColumn'],

    cls: 'x-portal',
    bodyCls: 'x-portal-body',
    bodyPadding: 8,
    defaultType: 'portalcolumn',
    autoScroll: true,
    maxColumns: 3,
    columnWidths: [],
    /*columnWidths: [
        0.25,
        0.25,
        0.25,
        0.25
    ],*/

    getMaxColumns: function() {
        return this.maxColumns;
    },
    setMaxColumns: function(max) {
        this.maxColumns = max;

        for (var i = 0; i < this.maxColumns; i++) {
            this.columnWidths.push(1/this.maxColumns);
        }
    },

    initComponent : function() {

        // Implement a Container beforeLayout call from the layout to this Container
        this.layout = {
            type: 'dashboard'
        };
        if (!this.columnWidths.length) {
            // set default max columns count to 3;
            this.setMaxColumns(this.maxColumns||3);
        }
        this.callParent();

        this.addEvents({
            validatedrop: true,
            beforedragover: true,
            dragover: true,
            beforedrop: true,
            drop: true
        });
        this.on('drop', this.doLayout, this);
    },

    // Set columnWidth, and set first and last column classes to allow exact CSS targeting.
    beforeLayout: function() {
        var items = this.layout.getLayoutItems(),
            len = items.length,
            i = 0,
            item;

        for (; i < len; i++) {
            item = items[i];
            if (item.isSplitter) continue;
            item.columnWidth = item.columnWidth || this.columnWidths[i];
        }
        return this.callParent(arguments);
    },

    // private
    initEvents : function(){
        this.callParent();
        this.dd = Ext.create('Zenoss.Dashboard.view.PortalDropZone', this, this.dropConfig);
    },

    // private
    beforeDestroy : function() {
        if (this.dd) {
            this.dd.unreg();
        }
        this.callParent();
    },
    createColumn: function(config) {
        var cycle = this.cycleLayout;
        return Ext.apply({
            items : [],
            bubbleEvents: ['add', 'childmove', 'resize'],
            listeners: {
                expand: cycle,
                collapse: cycle,
                scope: this
            }
        }, config);
    },
    /**
     * Readjust column/splitter heights for collapsing child panels
     * @private
     */
    cycleLayout: function() {
         this.updateLayout();
    }
});

/**
 */
Ext.define('Ext.layout.container.ColumnSplitterTracker', {
    extend: 'Ext.resizer.SplitterTracker',

    // We move the splitter el. Add the proxy class.
    onStart: function(e) {
        Ext.apply(this.getSplitter().el.dom.style, { top : 0, left : 0} );
        this.callParent(arguments);
    },

    endDrag: function () {
        var me = this;
        me.callParent(arguments); // this calls onEnd
        me.getSplitter().el.dom.style.left = 0;
    },

    performResize: function(e, offset) {
        var me        = this,
            prevCmp   = me.getPrevCmp(),
            nextCmp   = me.getNextCmp(),
            splitter  = me.getSplitter(),
            owner     = splitter.ownerCt,
            delta     = offset[0],
            prevWidth, nextWidth, ratio;

        if (prevCmp && nextCmp) {
            prevCmp.width = prevWidth = me.prevBox.width + delta;
            nextCmp.width = nextWidth = me.nextBox.width - delta;

            ratio = (prevCmp.columnWidth + nextCmp.columnWidth) / (prevWidth + nextWidth);

            prevCmp.columnWidth = prevWidth * ratio;
            nextCmp.columnWidth = nextWidth * ratio;
        }

        owner.updateLayout();
    }
});

Ext.define('Ext.layout.container.ColumnSplitter', {
    extend: 'Ext.resizer.Splitter',
    xtype: 'columnsplitter',

    isSplitter: true,
    synthetic  : true,
    cls : Ext.baseCSSPrefix + 'splitter-vertical',
    style: 'opacity: .3;margin: 0 1px;',
    orientation: 'vertical',
    collapseDirection: 'left',
    trackerClass: 'Ext.layout.container.ColumnSplitterTracker',
    width: 7,
    height: 1,

    getTrackerConfig: function () {
        var tracker = this.callParent();
        tracker.xclass = this.trackerClass;
        return tracker;
    }
});

/**
 * This layout extends `Ext.layout.container.Column` and adds splitters between adjacent
 * columns allowing the user to resize them.
 * @private
 */
Ext.define('Ext.layout.container.Dashboard', {
    extend: 'Ext.layout.container.Column',
    alias: 'layout.dashboard',

    type: 'dashboard',
    reserveScrollbar: true,
    firstColumnCls: Ext.baseCSSPrefix + 'portal-column-first',
    lastColumnCls: Ext.baseCSSPrefix + 'portal-column-last',

    /*
     * The geometry of a Column layout with splitters between respective items:
     *
     *             0        1      2       3        4
     *      +-----------------------------------------------+
     *      | +-----------+ || +---------+ || +-----------+ | \
     *      | |           | || |         | || |           | |  \
     *      | |           | || |         | || |           | |   \
     *      | |           | || |         | || |           | |    \
     *      | +-----------+ || |         | || |           | |   row[0]
     *      |               || |         | || |           | |    /
     *      |               || |         | || |           | |   /
     *      |               || |         | || +-----------+ |  /
     *      |               || |         | ||               | /
     *      |               || +---------+ ||               |
     *      | +-------------------+ || +------------------+ | \
     *      | |                   | || |                  | |  \
     *      | |                   | || |                  | |   \
     *      | |                   | || |                  | |  row[1]
     *      | |                   | || |                  | |   /
     *      | |                   | || +------------------+ |  /
     *      | +-------------------+ ||                      | /
     *      +-----------------------------------------------+
     *                  6           7            8
     *
     * The splitter between 4 and 6 will be hidden but still present in the items. It is
     * considered part of row[0].
     */

    getSplitterConfig: function() {
        return {
           xtype: 'columnsplitter'
        };
    },

    /**
     * @private
     * Returns a filtered item list sans splitters
     * @param items
     * @return {Array|*}
     */
    getColumns: function(items) {
        var array = Ext.Array;
        return array.filter(array.from(items), function(item) {
            return item.target && item.target.isSplitter !== true;
        });
    },

    beginLayout: function(ownerContext) {
        var me = this;
        me.callParent([ownerContext]);
        me.beforeLayoutCycle();

        // We need to reset the heights of the splitters so that they don't influence the
        // layout (mostly overflow management).
        var childItems = ownerContext.childItems,
            rows = (ownerContext.rows = []),
            length = childItems.length,
            totalWidth = 2,
            columnTargets = 0,
            lastRow = 0,
            maxColumns = me.owner.getMaxColumns(),
            child, i, prev, row, splitter, target, width;

        for (i = 0; i < length; ++i) {
            target = (child = childItems[i]).target;
            splitter = target && target.isSplitter;
            columnTargets += (splitter ? 0 : 1);
            width = splitter ? 0 : target.columnWidth || 1;
            if (totalWidth + width > 1 || (maxColumns && (columnTargets > maxColumns))) {
                if (prev) {
                    // We have wrapped and we have a previous item which is a splitter by
                    // definition. We have previously seen that splitter and setHeight(0)
                    // on it. We now setHeight(0) to effectively hide it.
                    prev.orphan = 1;
                    prev.el.setHeight(0);
                }
                totalWidth = 0;
                columnTargets = 1;

                if (rows.length) {
                    // We have encountered a row break condition
                    // As this is floating layout, classify the current row
                    // before proceeding
                    lastRow = rows.length - 1;
                    me.syncFirstLast(
                        me.getColumns(rows[lastRow].items)
                    );
                }
                rows.push(row = {
                    index: rows.length,
                    items: [],
                    maxHeight: 0
                });
            }

            totalWidth += width;
            row.items.push(child);
            child.row = row;
            target.rowIndex = row.index;

            if (splitter) {
                child.el.setHeight(1);
            }

            prev = child;
        }

        if (rows.length ) {
            me.syncFirstLast(
                me.getColumns(rows[rows.length-1].items)
            );
        }
    },

    beforeLayoutCycle: function(ownerContext) {
        var me = this,
            items = me.owner.items;

        // We need to do this in beforeLayoutCycle because this changes the child items
        // and hence needs to be considered before recursing.
        if (me.splitterGen !== items.generation) {
            me.syncSplitters();

            // The syncSplitters call will change items.generation so do this last.
            me.splitterGen = items.generation;
        }
    },

    finishedLayout: function (ownerContext) {
        var items = ownerContext.childItems,
            len = items.length,
            box, child, i, target, row;

        this.callParent([ownerContext]);

        for (i = 0; i < len; i += 2) {
            target = (child = items[i]).target;
            box = target.lastBox;
            row = child.row;
            row.maxHeight = Math.max(row.maxHeight, box.height);

            // Put this on the component so that it gets saved (we use this to fix up
            // columnWidth on restore)
            target.width = box.width;
        }

        for (i = 1; i < len; i += 2) {
            target = (child = items[i]).target;
            if (!child.orphan) {
                target.el.setHeight(child.row.maxHeight);
            }
        }
    },

     calculateColumns: function (ownerContext) {
        var me = this,
            containerSize = me.getContainerSize(ownerContext),
            innerCtContext = ownerContext.getEl('innerCt', me),
            items = ownerContext.childItems,
            len = items.length,
            contentWidths = [],
            columnWidths = [],
            contentWidth,
            rowIndex = 0,
            rowWidth,
            ownerContentWidth = 0,
            blocked, availableWidth, width, i, itemContext, itemMarginWidth, itemWidth;

        // Can never decide upon necessity of vertical scrollbar (and therefore, narrower
        // content width) until the component layout has published a height for the target
        // element.
        if (!ownerContext.heightModel.shrinkWrap && !ownerContext.targetContext.hasProp('height')) {
            return false;
        }

        // No parallel measurement, cannot lay out boxes.
        if (!containerSize.gotWidth) { //\\ TODO: Deal with target padding width
            ownerContext.targetContext.block(me, 'width');
            blocked = true;
        } else {
            width = containerSize.width;

            innerCtContext.setWidth(width);
        }

        // we need the widths of the columns we don't manage to proceed so we block on them
        // if they are not ready...
        for (i = 0; i < len; ++i) {
            itemContext = items[i];
            rowIndex = itemContext.target.rowIndex;
            // we can lose 0.1 (on different screen sizes it could be up to 40px)
            // or get additional 0.1 of column width when do layout
            // this cause to some empty space artifacts in rows, or additional rows in dashboard,
            // so we collect row width and later adjust first column to missed width;
            if (itemContext.target.isDashboardColumn) {
                if (!columnWidths[rowIndex]) {
                    columnWidths[rowIndex] = 0;
                }
                columnWidths[rowIndex] += itemContext.target.columnWidth;
            }
            // this is needed below for non-calculated columns, but is also needed in the
            // next loop for calculated columns... this way we only call getMarginInfo in
            // this loop and use the marginInfo property in the next...
            itemMarginWidth = itemContext.getMarginInfo().width;

            if (!itemContext.widthModel.calculated && !itemContext.orphan) {
                itemWidth = itemContext.getProp('width');
                if (typeof itemWidth != 'number') {
                    itemContext.block(me, 'width');
                    blocked = true;
                }

                if (!contentWidths[rowIndex]) {
                    contentWidths[rowIndex] = 0;
                }
                contentWidths[rowIndex] += itemWidth + itemMarginWidth;
            }
        }

        if (!blocked) {
            for (i = 0; i < len; ++i) {
                itemContext = items[i];
                if (itemContext.widthModel.calculated) {
                    rowIndex = itemContext.target.rowIndex;
                    contentWidth = contentWidths[rowIndex] || 0;
                    availableWidth = (width < contentWidth) ? 0 : width - contentWidth;
                    // increase/reduce of first col width in row if row width not equal 1(100% of available width);
                    rowWidth = columnWidths[rowIndex];
                    if (rowWidth && rowWidth !== 1) {
                        itemContext.target.columnWidth = itemContext.target.columnWidth + (1-rowWidth);
                        columnWidths[rowIndex] = 1;
                    }
                    itemMarginWidth = itemContext.marginInfo.width; // always set by above loop
                    itemWidth = itemContext.target.columnWidth;
                    itemWidth = Math.floor(itemWidth * availableWidth) - itemMarginWidth;
                    itemWidth = itemContext.setWidth(itemWidth); // constrains to min/maxWidth
                    ownerContentWidth += itemWidth + itemMarginWidth;
                }
            }

            ownerContext.setContentWidth(ownerContentWidth);
        }

        // we registered all the values that block this calculation, so abort now if blocked...
        return !blocked;
    },

    /**
     * This method synchronizes the splitters so that we have exactly one between each
     * column.
     * @private
     */
    syncSplitters: function () {
        var me = this,
            owner = me.owner,
            items = owner.items.items,
            index = items.length,
            ok = true,
            shouldBeSplitter = false,
            item, splitter;

        // Walk backwards over the items so that an insertion index is stable.
        while (index-- > 0) {
            item = items[index];
            if (shouldBeSplitter) {
                if (item.isSplitter) {
                    shouldBeSplitter = false;
                } else {
                    // An item is adjacent to an item, so inject a splitter beyond
                    // the current item to separate the columns. Keep shouldBeSplitter
                    // at true since we just encountered an item.
                    if (ok) {
                        ok = false;
                        owner.suspendLayouts();
                    }
                    splitter = owner.add(index+1, me.getSplitterConfig());
                }
            } else {
                if (item.isSplitter) {
                    // A splitter is adjacent to a splitter so we remove this one. We
                    // leave shouldBeSplitter at false because the next thing we see
                    // should still not be a splitter.
                    if (ok) {
                        ok = false;
                        owner.suspendLayouts();
                    }
                    owner.remove(item);
                } else {
                    shouldBeSplitter = true;
                }
            }
        }

        // It is possible to exit the above with a splitter as the first item, but
        // this is invalid so remove any such splitters.
        while (items.length && (item = items[0]).isSplitter) {
            if (ok) {
                ok = false;
                owner.suspendLayouts();
            }
            owner.remove(item);
        }

        if (!ok) {
            owner.resumeLayouts();
        }
    },

    syncFirstLast: function(items) {
        var me = this,
            firstCls = me.firstColumnCls,
            lastCls = me.lastColumnCls,
            len,
            firstAndLast = [firstCls, lastCls],
            i, item, last;

        items = Ext.Array.from(items);
        len = items.length;

        for (i = 0; i < len; ++i ) {
            item = items[i].target;
            last = (i === len-1);

            if (!i) { // if (first)
                if (last) {
                    item.addCls(firstAndLast);
                } else {
                    item.addCls(firstCls);
                    item.removeCls(lastCls);
                }
            } else if (last) {
                item.addCls(lastCls);
                item.removeCls(firstCls);
            } else {
                item.removeCls(firstAndLast);
            }
        }
    }
});
