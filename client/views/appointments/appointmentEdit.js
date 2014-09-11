function dayDelta(date) {
	var diff = moment(date).diff(moment().startOf('day'), "days");
	if (diff===1){
		return " tomorrow";
	}
	else if (diff===-1) {
		return " yesterday";
	}
	else if (diff === 0)
	{
		return " today"
	}
	else if (diff > 1)
	{
		return " in " +Math.abs(diff)+ " days"
	}
	else
	{
		return " "+Math.abs(diff)+" days ago"
	}
}
Template.insertAppointmentForm.rendered = function () {

}

Template.insertAppointmentForm.helpers({
	appointmentList: appointmentList,
	currentDate: function(){
		var momentobj = moment(Session.get("date"));
		var ret = momentobj.format("dddd, MMMM Do GGGG");
		return ret + " -"+ dayDelta(Session.get("date"));
	},
	sessionDate: function(){return Session.get("date")},
	length: function() {
		if (Session.get("formForInsert")) {
			var provObject = unusualDays.findOne({date: Session.get("date"), providerID: Session.get("selectedProviderId")})
			if (typeof provObject === "undefined") {
				provObject = providers.findOne(Session.get("selectedProviderId"))
			}
			try {return provObject.appointmentLength}
			catch (e) {
				console.log("looking for appointment length too early.")
				return 0;
			}//this error doesn't matter, it means the unusualDays
			// and Providers collections aren't filled yet.
			//will be fixed for real when iron router is used for appointment editing
			///creation
		} else {//update, grab length from current doc
			appointmentList.findOne(Session.get("currentlyEditingAppointment")).length
		}
	},
	currentType: function() {
		if(Session.get("formForInsert")) {
			return "insert"
		}
		else {
			return "update"
		}
	},
	timePreset: function() {
		if (Session.get("formForInsert")) {
			// $('#datetimepicker4').data("DateTimePicker").setDate(moment().local().startOf('day').hours(12));
			return "12:00 PM";
		} else {
			// $('#datetimepicker4').data("DateTimePicker").setDate(appointmentList.findOne(Session.get("currentlyEditingAppointment")).date);
			return appointmentList.findOne(Session.get("currentlyEditingAppointment")).time;
		}
	},
	currentDoc: function() {return appointmentList.findOne(Session.get("currentlyEditingAppointment"))}
});
AutoForm.hooks({
	insertAppointmentFormInner: {
		docToForm: function(doc){
			if (doc.date instanceof Date) {
				doc.time = moment(doc.date).format("h:mm A");
			}
			$('#datetimepicker4').data("DateTimePicker").setDate(moment(doc.date));
			return doc;
		},
		formToDoc: function(doc){
			if (typeof doc.time === "string") {
				var datestring = moment(Session.get("date")).zone(-12).format("YYYY-MM-DD ") + doc.time;
				//the time is localtime, the date is utc. Set the date to localtime, add the time
				//then convert back to utc.
				doc.date = moment(datestring, "YYYY-MM-DD hh:mm A").utc().toDate();
			}
			doc.providerID = Session.get("selectedProviderId");
			// console.log("logging doc")
			// console.log(doc)
			return doc;
		},
		onError: function(operation, error, template) {

			//	console.log(appointmentList.simpleSchema().namedContext("insertAppointmentFormInner").invalidKeys())
			for (var invalidKey in error.invalidKeys) {
				if (error.invalidKeys[invalidKey].type === "overlappingDates") {
					appointmentList.simpleSchema().namedContext("insertAppointmentFormInner").addInvalidKeys([{
						name: "time", 
						type: error.invalidKeys[invalidKey].type, 
						value: moment(error.invalidKeys[invalidKey].value).format("h:mm A")
					}])
				}
				else if (error.invalidKeys[invalidKey].type === "dateOutOfBounds") {
					try {
						var cleanDate = moment(template.data.doc.date).startOf("day");
						var provObject = unusualDays.findOne({date: cleanDate.toDate(), providerID: template.data.doc.providerID});
						if (typeof provObject === "undefined") {
							provObject = providers.findOne(template.data.doc.providerID);
						}
					} catch (e) {
						cleanDate = moment(Session.get('date')).startOf('day');
						provObject = unusualDays.findOne({date: cleanDate.toDate(), providerID: Session.get("selectedProviderId")});
						if (typeof provObject === "undefined") {
							provObject = providers.findOne(Session.get("selectedProviderId"));
						}
					}

					appointmentList.simpleSchema().namedContext("insertAppointmentFormInner").addInvalidKeys([{
						name: "time", 
						type: error.invalidKeys[invalidKey].type, 
						value: provObject.startTime + " and " + provObject.endTime
					}])
				}
			}
		},
		after: {
			insert: function(error, result) {//TODO: When appointment is made, use the data-id var
				//to find it in the appointment list and bounce it!
				if (error) {
					console.log("Insert Error:", error);
					$("#insertSuccessAlert").alert();
				} else {
					console.log("Insert Result:", result);
				}
			}
		}
	}
});
