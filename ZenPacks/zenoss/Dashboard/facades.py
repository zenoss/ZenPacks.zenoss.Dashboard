##############################################################################
#
# Copyright (C) Zenoss, Inc. 2014, all rights reserved.
#
# This content is made available according to terms specified in
# License.zenoss under the directory where your Zenoss product is installed.
#
##############################################################################
from Acquisition import aq_base
from zope.interface import implements
from Products.Zuul.interfaces import IFacade, IInfo
from Products.Zuul.facades import ZuulFacade
from ZenPacks.zenoss.Dashboard.Dashboard import Dashboard

class IDashboardFacade(IFacade):
    """
    A facade for the dashboards
    """
    pass

class DashboardFacade(ZuulFacade):
    implements(IDashboardFacade)

    def _getContext(self, uid):
        # special token meaning add it to the current user
        if uid == "current_user":
            obj = self._dmd.ZenUsers.getUserSettings()
        else:
            obj = self._getObject(uid)
        return obj

    def addDashboard(self, newId, uid, columns):
        """
        newId is the name of the dashboard
        uid is the context on which the dashboard appears. ZenUsers, UserSetings or GroupSettings
        """
        obj = self._getContext(uid)
        d = Dashboard(newId)
        d.columns = columns
        obj.dashboards._setObject(newId, d)

    def saveDashboard(self, data):
        """
        Need to do the following
        1. Rename the dashboard if the name changed
        2. move the dashboash if the context changed
        3. call regular set info to save properties
        """
        # will fail if the uid isn't passed in
        uid = data['uid']
        del data['uid']
        d = self._getObject(uid)

        # 1. rename dashboard
        if data['newId'] != d.id:
            IInfo(d).rename(data['newId'])

        # 2. move object if context changed
        newContext = self._getContext(data['contextUid'])
        del data['contextUid']
        if newContext != d.getContext():
            oldContext = d.getContext()
            oldContext.dashboards._delObject(d.id)
            d = aq_base(d)
            newContext.dashboards._setObject(d.id, d)
            # fetch the object in the new context
            d = newContext.dashboards._getOb(d.id)

        # 3. save the rest of the data
        self.setInfo(d.getPrimaryId(), data)
        return IInfo(d)

    def saveDashboardState(self, uid, state):
        dashboard = self._getObject(uid)
        if dashboard.state != state:
            dashboard.state = state

    def getAvailableDashboards(self):
        """
        Available dashboards come from three places

        1. Global (they are on dmd.ZenUsers)
        2. The User Groups current user belongs to
        3. Any exclusive to that user
        """
        dashboards = []
        user = self._dmd.ZenUsers.getUserSettings()

        # 1. Global Dashboards
        dashboards.extend([IInfo(d) for d in self._dmd.ZenUsers.dashboards()])

        # 2. Dashboards defined on my groups
        for name in user.getUserGroupSettingsNames():
            group = self._dmd.ZenUsers.getGroupSettings(name)
            dashboards.extend([IInfo(d) for d in group.dashboards()])

        # 3. My dashboards
        dashboards.extend([IInfo(d) for d in user.dashboards()])

        return dashboards

    def getCurrentUsersGroups(self):
        results = []
        user = self._dmd.ZenUsers.getUserSettings()
        for name in user.getUserGroupSettingsNames():
            group = self._dmd.ZenUsers.getGroupSettings(name)
            results.append(dict(uid=group.getPrimaryId(), name=group.id))
        return results
