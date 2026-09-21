FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /src
COPY gradlew settings.gradle build.gradle ./
COPY gradle gradle
COPY src src
RUN chmod +x gradlew && ./gradlew bootJar -x test --no-daemon \
	&& cp build/libs/backend-0.0.1-SNAPSHOT.jar /tmp/app.jar

FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache curl \
	&& addgroup -S borrowhub && adduser -S borrowhub -G borrowhub
WORKDIR /app
COPY --from=build /tmp/app.jar app.jar
USER borrowhub
EXPOSE 8080
HEALTHCHECK --interval=5s --timeout=5s --start-period=40s --retries=20 \
	CMD curl -fsS http://127.0.0.1:8080/actuator/health/readiness || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
