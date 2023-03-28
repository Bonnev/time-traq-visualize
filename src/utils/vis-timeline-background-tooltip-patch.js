/* eslint-disable no-var */

export default function patchItemSet(util, timeline) {
	timeline.components.ItemSet.prototype._onMouseOver = function(event) {
		var item = this.itemFromTarget(event);

		// CHANGE STARTS HERE
		if (!item) { // MODIFIED
			var cur = event.target;
			while (cur) {
				if (Object.prototype.hasOwnProperty.call(cur, 'timeline-item-background')) {
					item = cur['timeline-item-background'];
					break;
				}
				cur = cur.parentNode;
			}
		}
		// CHANGE ENDS HERE

		if (!item) return; // Item we just left

		var related = this.itemFromRelatedTarget(event);

		if (item === related) {
			// We haven't changed item, just element in the item
			return;
		}

		var title = item.getTitle();

		if (this.options.showTooltips && title) {
			if (this.popup == null) {
				this.popup = new util.Popup(this.body.dom.root, this.options.tooltip.overflowMethod || 'flip');
			}

			this.popup.setText(title);
			var container = this.body.dom.centerContainer;
			var containerRect = container.getBoundingClientRect();
			this.popup.setPosition(event.clientX - containerRect.left + container.offsetLeft, event.clientY - containerRect.top + container.offsetTop);
			this.setPopupTimer(this.popup);
		} else {
			// Hovering over item without a title, hide popup
			// Needed instead of _just_ in _onMouseOut due to #2572
			this.clearPopupTimer();

			if (this.popup != null) {
				this.popup.hide();
			}
		}

		this.body.emitter.emit('itemover', {
			item: item.id,
			event: event
		});
	};

	timeline.components.ItemSet.prototype._onMouseOut = function(event) {
		var item = this.itemFromTarget(event);

		// CHANGE STARTS HERE
		if (!item) {
			var cur = event.target;
			while (cur) {
				if (Object.prototype.hasOwnProperty.call(cur, 'timeline-item-background')) {
					item = cur['timeline-item-background'];
					break;
				}
				cur = cur.parentNode;
			}
		}
		// CHANGE ENDS HERE

		if (!item) return; // Item we are going to

		var related = this.itemFromRelatedTarget(event);

		if (item === related) {
			// We aren't changing item, just element in the item
			return;
		}

		this.clearPopupTimer();

		if (this.popup != null) {
			this.popup.hide();
		}

		this.body.emitter.emit('itemout', {
			item: item.id,
			event: event
		});
	};

	timeline.components.items.BackgroundItem.prototype._createDomElement = function() {
		if (!this.dom) {
			// create DOM
			this.dom = {}; // background box

			this.dom.box = document.createElement('div'); // className is updated in redraw()
			// frame box (to prevent the item contents from overflowing

			this.dom.frame = document.createElement('div');
			this.dom.frame.className = 'vis-item-overflow';
			this.dom.box.appendChild(this.dom.frame); // contents box

			this.dom.content = document.createElement('div');
			this.dom.content.className = 'vis-item-content';
			this.dom.frame.appendChild(this.dom.content); // Note: we do NOT attach this item as attribute to the DOM,
			//	 such that background items cannot be selected
			this.dom.box['vis-item'] = this; // CHANGE HERE

			this.dirty = true;
		}
	};
}