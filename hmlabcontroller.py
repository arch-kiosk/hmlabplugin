from flask import Blueprint, render_template, redirect, url_for

import kioskglobals
from authorization import full_login_required, EDIT_WORKSTATION_PRIVILEGE, \
    SYNCHRONIZE, PREPARE_WORKSTATIONS, DOWNLOAD_WORKSTATION, UPLOAD_WORKSTATION, CREATE_WORKSTATION
from core.kioskcontrollerplugin import get_plugin_for_controller
from kiosklib import nocache

_plugin_name_ = "hmlabplugin"
_controller_name_ = "hmlab"
_url_prefix_ = '/' + _controller_name_
plugin_version = "0.13"

LOCAL_PRIVILEGES = {
    EDIT_WORKSTATION_PRIVILEGE: "edit workstation",
    CREATE_WORKSTATION: "create workstation",
    PREPARE_WORKSTATIONS: "prepare workstation",
    DOWNLOAD_WORKSTATION: "download workstation",
    UPLOAD_WORKSTATION: "upload workstation",
    SYNCHRONIZE: "synchronize"
}

hmlab = Blueprint(_controller_name_, __name__,
                  template_folder='templates',
                  static_folder="static",
                  url_prefix=_url_prefix_)
print(f"{_controller_name_} module loaded")


@hmlab.context_processor
def inject_current_plugin_controller():
    return dict(current_plugin_controller=get_plugin_for_controller(_plugin_name_))


#  **************************************************************
#  ****    /redirecting index
#  **************************************************************
@hmlab.route('_redirect', methods=['GET'])
@full_login_required
def hm_lab_index():
    print("------------- redirecting")
    return redirect(url_for("hmlab.hm_lab_show"))


#  **************************************************************
#  ****    /hm_lab_show
#  *****************************************************************/
@hmlab.route('', methods=['GET', 'POST'])
@full_login_required
@nocache
def hm_lab_show():
    print("\n*************** hmlab / ")
    print(f"\nGET: get_plugin_for_controller returns {get_plugin_for_controller(_plugin_name_)}")
    print(f"\nGET: plugin.name returns {get_plugin_for_controller(_plugin_name_).name}")

    conf = kioskglobals.get_config()
    return render_template('hmlab.html')
