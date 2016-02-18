function Share (
		jqHolder,
		url,
		title,
		text,
		image
	) {
	var list = {
			'vkontakte': {
				url: 'http://vk.com/share.php?url='+url+'&title='+title+'&description='+text+'&image='+image+'&noparse=true',
				imgId: 0
			},
			'facebook': {
				url: 'http://www.facebook.com/sharer/sharer.php?u='+url,
				imgId: 1
			},
			'twitter': {
				url: 'http://twitter.com/intent/tweet?text='+title+': '+text+'&url='+url,
				imgId: 2
			},
			'odnoklassniki': {
				url: 'http://www.odnoklassniki.ru/dk?st.cmd=addShare&st.s=1&st._surl='+url+'&st.comments='+title+': '+text,
				imgId: 3
			},
			'googleplus': {
				url: 'http://plus.google.com/share?url='+url,
				imgId: 4
			},
		};
	for (var i in list) {
		jqHolder.append ($ (
			'<a target="_blank" href="' +
				list[i].url +
				'" class="share_btn" ' +
				'style="background-position: ' + (-list[i].imgId * 32) + 'px 0px;"></a>'
		));
	}
}