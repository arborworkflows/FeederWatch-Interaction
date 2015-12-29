# FeederWatch-Interaction
Prototype application for adding interspecies activity to previously uploaded FeederWatch observations

This application allows a user to enter additional information about interspecies interactions to FeederWatch observations.
The user enters an observation ID for a particular existing observation.  The FeederWatch API is used to retrieve information on the 
 species and counts observed in the observation.  Then user can add "interaction" records one-at-a-time.  Records of the 
 interactions are kept in a mongoDB collection on the webserver.  
 
 A companion viewing application offers simple visual review of the observations by placing them as geolocated dots over a Google
 Map background. 
 
 This prototype application was developed by KnowledgeVis, LLC in support of Cornell University. The Tangelo web framework (developed 
 by Kitware, Inc. is used for this application.  This is some of the technology from the software stack used by Arbor Workflows (arborworkflows.com).
 
