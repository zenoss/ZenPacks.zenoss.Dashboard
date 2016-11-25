##############################################################################
#
# Copyright (C) Zenoss, Inc. 2014, all rights reserved.
#
# This content is made available according to terms specified in
# License.zenoss under the directory where your Zenoss product is installed.
#
##############################################################################

from Products.ZenModel.UserSettings import GroupSettings
from Products.Zuul.infos import InfoBase, ProxyProperty
from Products.Zuul.interfaces import IInfo
from zope.interface import implements


class IDashboardInfo(IInfo):
    """
    A User configurable dashboard
    """


class DashboardInfo(InfoBase):
    implements(IDashboardInfo)
    name = ProxyProperty('name')
    owner = ProxyProperty('owner')
    columns = ProxyProperty('columns')
    state = ProxyProperty('state')
    locked = ProxyProperty('locked')
    audit = ProxyProperty('audit')

    @property
    def contextUid(self):
        obj = self._object
        return obj.getContext().primaryAq().getPrimaryId()

    @property
    def contextType(self):
        obj = self._object
        if obj.userSettingManager():
            return "global"
        context = obj.userSetting()
        if isinstance(context, GroupSettings):
            return "user_groups"
        return "current_user"
